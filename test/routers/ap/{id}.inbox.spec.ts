import assert from "node:assert";
import crypto from "node:crypto";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";

import { clearTables } from "../../utils";
import { requestApp } from "../utils";

// Unique per test run so Fedify's MemoryKvStore deduplication doesn't drop replayed activities
const uid = crypto.randomBytes(6).toString("hex");

async function waitFor<T>(
  fn: () => Promise<T | null | undefined>,
  { timeout = 3000, interval = 100 } = {}
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result != null) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
}

const domain = new URL(process.env.API_DOMAIN || "http://localhost:3000").host;

function followActivity(opts: {
  id: string;
  actorUrl: string;
  objectUrl: string;
}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: opts.id,
    type: "Follow",
    actor: opts.actorUrl,
    object: opts.objectUrl,
  };
}

function undoFollowActivity(opts: {
  id: string;
  actorUrl: string;
  followId: string;
  objectUrl: string;
}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: opts.id,
    type: "Undo",
    actor: opts.actorUrl,
    object: {
      id: opts.followId,
      type: "Follow",
      actor: opts.actorUrl,
      object: opts.objectUrl,
    },
  };
}

function deleteActivity(opts: { id: string; actorUrl: string }) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: opts.id,
    type: "Delete",
    actor: opts.actorUrl,
    object: opts.actorUrl,
  };
}

describe("ap/artists/{id}/inbox (ActivityPub)", function () {
  this.timeout(8000);

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("Follow", function () {
    it("stores the follower and creates a notification", async function () {
      // Allow time for Fedify's async queue to process activities + waitFor polling.
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.artist.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = "https://mastodon.social/users/testfollower";
      const objectUrl = `https://${domain}/v1/artists/${targetArtist.urlSlug}`;

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          followActivity({
            id: `${actorUrl}#follows/${targetArtist.urlSlug}-${uid}`,
            actorUrl,
            objectUrl,
          })
        );

      // Fedify returns 202 Accepted for inbox POSTs it processes
      assert.equal(response.statusCode, 202);

      // Fedify's InProcessMessageQueue processes the activity after the 202
      // response, so we poll until the DB reflects the handler's writes.
      const stored = await waitFor(() =>
        prisma.activityPubArtistFollowers.findFirst({
          where: { artistId: targetArtist.id, actor: actorUrl },
        })
      );
      assert(stored, "follower record should be stored in DB");

      const notification = await waitFor(() =>
        prisma.notification.findFirst({
          where: {
            userId: targetArtist.userId,
            notificationType: "AP_FOLLOW",
          },
        })
      );
      assert(notification, "AP_FOLLOW notification should be created");
      assert.equal(
        (notification.metadata as { ap: { actor: string } }).ap.actor,
        actorUrl
      );
    });

    it("returns 404 when the target artist does not exist", async () => {
      const actorUrl = `https://${domain}/v1/artists/nobody`;
      const response = await requestApp
        .post(`ap/artists/nonexistent-artist/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          followActivity({
            id: `${actorUrl}#follows/nonexistent-artist-${uid}`,
            actorUrl,
            objectUrl: `https://${domain}/v1/ap/artists/nonexistent-artist`,
          })
        );

      // Fedify returns 404 when the actor dispatcher returns null for an unknown identifier
      assert.equal(response.statusCode, 404);
    });
  });

  describe("Undo(Follow)", () => {
    it("removes an existing follower", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.artist.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = "https://mastodon.social/users/someuser";

      // Pre-seed a follower record
      await prisma.activityPubArtistFollowers.create({
        data: {
          artistId: targetArtist.id,
          actor: actorUrl,
          inboxUrl: "https://mastodon.social/users/someuser/inbox",
        },
      });

      const objectUrl = `https://${domain}/v1/artists/${targetArtist.urlSlug}`;

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          undoFollowActivity({
            id: `${actorUrl}#undo-follow/${targetArtist.urlSlug}-${uid}`,
            actorUrl,
            followId: `${actorUrl}#follows/${targetArtist.urlSlug}-${uid}`,
            objectUrl,
          })
        );

      assert.equal(response.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.activityPubArtistFollowers.findFirst({
          where: { artistId: targetArtist.id, actor: actorUrl },
        });
        return r === null ? true : null;
      });
    });
  });

  describe("Delete", () => {
    it("removes a follower whose account was deleted", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.artist.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = "https://mastodon.social/users/deleteduser";

      await prisma.activityPubArtistFollowers.create({
        data: {
          artistId: targetArtist.id,
          actor: actorUrl,
          inboxUrl: "https://mastodon.social/users/deleteduser/inbox",
        },
      });

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(deleteActivity({ id: `${actorUrl}#delete-${uid}`, actorUrl }));

      assert.equal(response.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.activityPubArtistFollowers.findFirst({
          where: { artistId: targetArtist.id, actor: actorUrl },
        });
        return r === null ? true : null;
      });
    });

    it("is idempotent when the actor was never a follower", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.artist.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = "https://mastodon.social/users/strangeruser";

      const response = await requestApp
        .post(`v1/ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(deleteActivity({ id: `${actorUrl}#delete-${uid}`, actorUrl }));

      assert.equal(response.statusCode, 404);
    });
  });
});
