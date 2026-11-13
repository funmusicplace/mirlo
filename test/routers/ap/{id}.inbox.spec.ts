import assert from "node:assert";
import crypto from "node:crypto";
import http from "node:http";
import { AddressInfo } from "node:net";
import os from "node:os";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";

import { redisClient } from "../../../src/config/redis";
import { clearTables, createProfile, createUser } from "../../utils";
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

function waitForProcessed(activityId: string) {
  const pattern = `fedify::_fedify::activityIdempotence::*::${activityId.replaceAll(":", "_:")}`;
  return waitFor(async () =>
    (await redisClient.keys(pattern)).length > 0 ? true : null
  );
}

const domain = new URL(process.env.API_DOMAIN || "http://localhost:3000").host;

async function startFakeRemoteActor() {
  const received: { type?: string }[] = [];
  const server = http.createServer((req, res) => {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        received.push(JSON.parse(body));
        res.writeHead(202).end();
      });
      return;
    }
    res.writeHead(200, { "Content-Type": "application/activity+json" });
    res.end(
      JSON.stringify({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: actorUrl,
        type: "Person",
        preferredUsername: "follower",
        inbox: `${actorUrl}/inbox`,
      })
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "0.0.0.0", resolve));

  const host = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i?.family === "IPv4" && !i.internal)?.address;
  const { port } = server.address() as AddressInfo;
  const actorUrl = `http://${host}:${port}/users/follower`;

  return {
    actorUrl,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

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

function deleteActivity(opts: {
  id: string;
  actorUrl: string;
  object?: unknown;
}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: opts.id,
    type: "Delete",
    actor: opts.actorUrl,
    object: opts.object ?? opts.actorUrl,
  };
}

const PUBLIC_AUDIENCE = "https://www.w3.org/ns/activitystreams#Public";

const MASTODON_MENTION_HTML =
  '<p><span class="h-card"><a href="https://mastodon.social/@target" class="u-url mention">@<span>target</span></a></span> love this &amp; <a href="https://example.com/foo"><span class="invisible">https://</span><span class="ellipsis">example.com/fo</span><span class="invisible">o</span></a><br>new track</p>';

function mentionActivity(opts: {
  id: string;
  objectId: string;
  actorUrl: string;
  mentionedUrls: string[];
  objectType?: string;
  to?: string[];
  summary?: string;
  sensitive?: boolean;
  content?: string;
  preferredUsername?: string;
  url?: string;
  name?: string;
}) {
  const to = opts.to ?? [PUBLIC_AUDIENCE];
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: opts.id,
    type: "Create",
    actor: {
      id: opts.actorUrl,
      type: "Person",
      preferredUsername: opts.preferredUsername ?? "mentioner",
      name: opts.name ?? "Mentioner",
      inbox: `${opts.actorUrl}/inbox`,
    },
    to,
    object: {
      id: opts.objectId,
      type: opts.objectType ?? "Note",
      attributedTo: opts.actorUrl,
      url: opts.url ?? `${opts.objectId}/view`,
      to,
      content: opts.content ?? MASTODON_MENTION_HTML,
      ...(opts.summary ? { summary: opts.summary } : {}),
      ...(opts.sensitive ? { sensitive: true } : {}),
      tag: opts.mentionedUrls.map((href) => ({
        type: "Mention",
        href,
        name: "@target",
      })),
    },
  };
}

async function getActorUri(urlSlug: string) {
  const response = await requestApp
    .get(`ap/artists/${urlSlug}`)
    .set("Accept", "application/activity+json");
  return response.body.id as string;
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
    let remote: Awaited<ReturnType<typeof startFakeRemoteActor>> | undefined;

    afterEach(async () => {
      await remote?.close();
      remote = undefined;
    });

    it("stores the follower and creates a notification", async function () {
      // Allow time for Fedify's async queue to process activities + waitFor polling.
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.profile.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      remote = await startFakeRemoteActor();
      const { actorUrl } = remote;
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
        prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: actorUrl },
        })
      );
      assert(stored, "follower record should be stored in DB");
      assert.equal(stored.inboxUrl, `${actorUrl}/inbox`);

      await waitFor(async () =>
        remote?.received.some((a) => a.type === "Accept") ? true : null
      );

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

    it("accepts a repeated follow without notifying the artist again", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.profile.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      remote = await startFakeRemoteActor();
      const { actorUrl } = remote;
      const objectUrl = `https://${domain}/v1/artists/${targetArtist.urlSlug}`;

      for (const attempt of [1, 2]) {
        const response = await requestApp
          .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
          .set("Content-Type", "application/activity+json")
          .send(
            followActivity({
              id: `${actorUrl}#follows/${targetArtist.urlSlug}-${uid}-${attempt}`,
              actorUrl,
              objectUrl,
            })
          );
        assert.equal(response.statusCode, 202);

        await waitFor(async () =>
          remote &&
          remote.received.filter((a) => a.type === "Accept").length >= attempt
            ? true
            : null
        );
      }

      const notifications = await prisma.notification.count({
        where: { userId: targetArtist.userId, notificationType: "AP_FOLLOW" },
      });
      assert.equal(notifications, 1);
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

  describe("Create mentioning an artist", function () {
    const actorUrl = "https://mastodon.social/users/mentioner";

    const deliver = (
      urlSlug: string,
      opts: Omit<Parameters<typeof mentionActivity>[0], "id" | "actorUrl"> & {
        actorUrl?: string;
        activitySuffix?: string;
      }
    ) =>
      requestApp
        .post(`ap/artists/${urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          mentionActivity({
            ...opts,
            actorUrl: opts.actorUrl ?? actorUrl,
            id: `${opts.objectId}/activity${opts.activitySuffix ?? ""}`,
          })
        );

    const mentionsOf = (objectId: string) =>
      prisma.notification.findMany({
        where: {
          notificationType: "AP_MENTION",
          metadata: { path: ["ap", "objectId"], equals: objectId },
        },
      });

    const waitForMention = (profileId: number, objectId: string) =>
      waitFor(() =>
        prisma.notification.findFirst({
          where: {
            profileId,
            notificationType: "AP_MENTION",
            metadata: { path: ["ap", "objectId"], equals: objectId },
          },
        })
      );

    it("creates an AP_MENTION notification from a Mastodon mention", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/mention-${uid}`;

      const response = await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });
      assert.equal(response.statusCode, 202);

      const notification = await waitForMention(artist.id, objectId);
      assert.equal(notification.userId, artist.userId);
      assert.equal(
        notification.content,
        "@target love this & https://example.com/foo new track"
      );
      assert.deepEqual(notification.metadata, {
        ap: {
          actor: actorUrl,
          actorName: "Mentioner",
          actorHandle: "@mentioner@mastodon.social",
          objectId,
          url: `${objectId}/view`,
        },
      });
    });

    it("keeps the content warning and drops the excerpt of a sensitive post", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/cw-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        summary: "spoilers for the new album",
        sensitive: true,
      });

      const notification = await waitForMention(artist.id, objectId);
      assert.equal(notification.content, null);
      const ap = (notification.metadata as PrismaJson.NotificationMetaData).ap;
      assert.equal(ap.contentWarning, "spoilers for the new album");
    });

    it("keeps the excerpt of a post whose only sensitive part is its media", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/sensitive-media-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        sensitive: true,
      });

      const notification = await waitForMention(artist.id, objectId);
      assert.equal(
        notification.content,
        "@target love this & https://example.com/foo new track"
      );
      const ap = (notification.metadata as PrismaJson.NotificationMetaData).ap;
      assert.equal(ap.contentWarning, undefined);
    });

    it("drops script and style text from the excerpt", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/script-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        content:
          "<p>hello <script>alert(1)</script><style>p{color:red}</style>there</p>",
      });

      const notification = await waitForMention(artist.id, objectId);
      assert.equal(notification.content, "hello there");
    });

    it("does not notify a co-mentioned artist that turned ActivityPub off", async () => {
      const { user: firstOwner } = await createUser({
        email: "first-artist@test.com",
      });
      const first = await createProfile(firstOwner.id, {
        urlSlug: "first-artist",
        activityPub: true,
      });
      const { user: secondOwner } = await createUser({
        email: "second-artist@test.com",
      });
      const second = await createProfile(secondOwner.id, {
        urlSlug: "second-artist",
        activityPub: true,
      });
      const secondUri = await getActorUri(second.urlSlug);
      await prisma.profile.update({
        where: { id: second.id },
        data: { activityPub: false },
      });
      const objectId = `${actorUrl}/statuses/co-mention-${uid}`;

      await deliver(first.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(first.urlSlug), secondUri],
      });

      await waitForProcessed(`${objectId}/activity`);
      await waitForMention(first.id, objectId);
      const secondMentions = await prisma.notification.findMany({
        where: { profileId: second.id, notificationType: "AP_MENTION" },
      });
      assert.equal(secondMentions.length, 0);
    });

    it("does not store a mention whose post was deleted before it was processed", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const mentionedUrl = await getActorUri(artist.urlSlug);
      const objectId = `${actorUrl}/statuses/deleted-first-${uid}`;

      await requestApp
        .post(`ap/artists/${artist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${objectId}#delete`,
            actorUrl,
            object: { id: objectId, type: "Tombstone" },
          })
        );
      await waitForProcessed(`${objectId}#delete`);
      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [mentionedUrl],
      });
      await waitForProcessed(`${objectId}/activity`);

      assert.equal(
        await redisClient.exists(`ap-mention:${artist.id}:${objectId}`),
        1
      );
      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("does not store a mention from an account deleted before it was processed", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const goneActorUrl = `https://mastodon.social/users/gone-mentioner-${uid}`;
      const objectId = `${goneActorUrl}/statuses/1`;

      await requestApp
        .post(`ap/artists/${artist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${goneActorUrl}#delete`,
            actorUrl: goneActorUrl,
          })
        );
      await waitForProcessed(`${goneActorUrl}#delete`);
      await deliver(artist.urlSlug, {
        objectId,
        actorUrl: goneActorUrl,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });
      await waitForProcessed(`${objectId}/activity`);

      assert.equal(
        await redisClient.exists(`ap-mention:${artist.id}:${objectId}`),
        1
      );
      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("keeps a mention when another actor deleted an object with the same id first", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const otherActorUrl = `https://mastodon.social/users/impostor-${uid}`;
      const objectId = `${actorUrl}/statuses/impostor-delete-${uid}`;

      await requestApp
        .post(`ap/artists/${artist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${otherActorUrl}#delete-${uid}`,
            actorUrl: otherActorUrl,
            object: { id: objectId, type: "Tombstone" },
          })
        );
      await waitForProcessed(`${otherActorUrl}#delete-${uid}`);
      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });

      await waitForMention(artist.id, objectId);
    });

    it("drops a handle that could hide or reorder the actor's host", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const mentionedUrl = await getActorUri(artist.urlSlug);
      const usernames = [
        `admin@mastodon.social${"\u200B".repeat(180)}`,
        "evil\u202Elaicos.nodotsam",
        "two words",
      ];

      for (const [index, preferredUsername] of usernames.entries()) {
        const objectId = `${actorUrl}/statuses/handle-${index}-${uid}`;
        await deliver(artist.urlSlug, {
          objectId,
          mentionedUrls: [mentionedUrl],
          preferredUsername,
        });
        const notification = await waitForMention(artist.id, objectId);
        const ap = (notification.metadata as PrismaJson.NotificationMetaData)
          .ap;
        assert.equal(ap.actorHandle, undefined);
        assert.equal(ap.actorName, "Mentioner");
      }
    });

    it("keeps a handle whose username uses combining marks", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/combining-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        preferredUsername: "\u0936\u0941\u092D\u092E",
      });

      const notification = await waitForMention(artist.id, objectId);
      const ap = (notification.metadata as PrismaJson.NotificationMetaData).ap;
      assert.equal(ap.actorHandle, "@\u0936\u0941\u092D\u092E@mastodon.social");
    });

    it("stores a mention whose actor name has a lone surrogate", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/surrogate-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        name: "Broken \uD800 name",
      });

      const notification = await waitForMention(artist.id, objectId);
      const ap = (notification.metadata as PrismaJson.NotificationMetaData).ap;
      assert.equal(ap.actorName, "Broken \uFFFD name");
    });

    it("links to the post id when its url points to another origin", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/foreign-url-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
        url: "https://phishing.example/login",
      });

      const notification = await waitForMention(artist.id, objectId);
      const ap = (notification.metadata as PrismaJson.NotificationMetaData).ap;
      assert.equal(ap.url, objectId);
    });

    it("accepts mentions in an Article", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/articles/mention-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        objectType: "Article",
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });

      await waitForMention(artist.id, objectId);
    });

    it("notifies every local artist mentioned in a single delivery", async () => {
      const { user: firstOwner } = await createUser({
        email: "first-artist@test.com",
      });
      const first = await createProfile(firstOwner.id, {
        urlSlug: "first-artist",
        activityPub: true,
      });
      const { user: secondOwner } = await createUser({
        email: "second-artist@test.com",
      });
      const second = await createProfile(secondOwner.id, {
        urlSlug: "second-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/two-artists-${uid}`;

      await deliver(first.urlSlug, {
        objectId,
        mentionedUrls: [
          await getActorUri(first.urlSlug),
          await getActorUri(second.urlSlug),
        ],
      });

      await waitForMention(first.id, objectId);
      await waitForMention(second.id, objectId);
    });

    it("ignores an object that does not mention the artist", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/no-mention-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: ["https://mastodon.social/users/someoneelse"],
      });
      await waitForProcessed(`${objectId}/activity`);

      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("ignores a mention that is not public", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const mentionedUrl = await getActorUri(artist.urlSlug);
      const objectId = `${actorUrl}/statuses/direct-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [mentionedUrl],
        to: [mentionedUrl],
      });
      await waitForProcessed(`${objectId}/activity`);

      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("ignores an object hosted on another origin than its actor", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `https://other.example/statuses/foreign-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });
      await waitForProcessed(`${objectId}/activity`);

      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("does not duplicate a mention delivered twice", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const mentionedUrl = await getActorUri(artist.urlSlug);
      const objectId = `${actorUrl}/statuses/duplicate-${uid}`;

      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [mentionedUrl],
      });
      await waitForMention(artist.id, objectId);
      await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [mentionedUrl],
        activitySuffix: "-again",
      });
      await waitForProcessed(`${objectId}/activity-again`);

      assert.equal((await mentionsOf(objectId)).length, 1);
    });

    it("does not notify when the artist turned off fediverse mentions", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
        allowFediverseMentions: false,
      });
      const objectId = `${actorUrl}/statuses/disabled-${uid}`;

      const response = await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });
      assert.equal(response.statusCode, 202);
      await waitForProcessed(`${objectId}/activity`);

      assert.equal((await mentionsOf(objectId)).length, 0);
    });

    it("does not notify when the artist owner is suspended", async () => {
      const { user: artistOwner } = await createUser({
        email: "target-artist@test.com",
        disabledAt: new Date(),
      });
      const artist = await createProfile(artistOwner.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const objectId = `${actorUrl}/statuses/suspended-${uid}`;

      const response = await deliver(artist.urlSlug, {
        objectId,
        mentionedUrls: [await getActorUri(artist.urlSlug)],
      });
      assert.equal(response.statusCode, 202);
      await waitForProcessed(`${objectId}/activity`);

      assert.equal((await mentionsOf(objectId)).length, 0);
    });
  });

  describe("Undo(Follow)", () => {
    it("removes an existing follower", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.profile.create({
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
      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: targetArtist.id,
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
        const r = await prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: actorUrl },
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
      const targetArtist = await prisma.profile.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = `https://mastodon.social/users/deleteduser-${uid}`;

      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: targetArtist.id,
          actor: actorUrl,
          inboxUrl: `${actorUrl}/inbox`,
        },
      });

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(deleteActivity({ id: `${actorUrl}#delete-${uid}`, actorUrl }));

      assert.equal(response.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: actorUrl },
        });
        return r === null ? true : null;
      });
    });

    it("removes the mentions of an account that was deleted", async () => {
      const { user } = await createUser({ email: "target@test.com" });
      const targetArtist = await createProfile(user.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });

      const actorUrl = `https://mastodon.social/users/deletedmentioner-${uid}`;
      const otherUrl = "https://mastodon.social/users/stillhere";

      const deletedMention = await prisma.notification.create({
        data: {
          userId: user.id,
          profileId: targetArtist.id,
          notificationType: "AP_MENTION",
          metadata: {
            ap: { actor: actorUrl, objectId: `${actorUrl}/statuses/1` },
          },
        },
      });
      const keptMention = await prisma.notification.create({
        data: {
          userId: user.id,
          profileId: targetArtist.id,
          notificationType: "AP_MENTION",
          metadata: {
            ap: { actor: otherUrl, objectId: `${otherUrl}/statuses/1` },
          },
        },
      });

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({ id: `${actorUrl}#delete-mentions-${uid}`, actorUrl })
        );
      assert.equal(response.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.notification.findUnique({
          where: { id: deletedMention.id },
        });
        return r === null ? true : null;
      });
      const kept = await prisma.notification.findUnique({
        where: { id: keptMention.id },
      });
      assert.ok(kept);
    });

    it("removes a follower with an oversized actor URL without writing a tombstone", async () => {
      const { user } = await createUser({ email: "target@test.com" });
      const targetArtist = await createProfile(user.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const actorUrl = `https://mastodon.social/users/${"a".repeat(2100)}-${uid}`;

      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: targetArtist.id,
          actor: actorUrl,
          inboxUrl: "https://mastodon.social/inbox",
        },
      });

      await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(deleteActivity({ id: `${actorUrl}#delete`, actorUrl }));

      await waitFor(async () => {
        const r = await prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: actorUrl },
        });
        return r === null ? true : null;
      });
      assert.equal(
        await redisClient.exists(`ap-mention-deleted:${actorUrl}`),
        0
      );
    });

    it("ignores a post Delete with an oversized object id", async () => {
      const { user } = await createUser({ email: "target@test.com" });
      const targetArtist = await createProfile(user.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });
      const actorUrl = `https://mastodon.social/users/longpost-${uid}`;
      const noteId = `${actorUrl}/statuses/${"9".repeat(2100)}`;
      const mention = await prisma.notification.create({
        data: {
          userId: user.id,
          profileId: targetArtist.id,
          notificationType: "AP_MENTION",
          metadata: { ap: { actor: actorUrl, objectId: noteId } },
        },
      });
      const deleteId = `${actorUrl}#delete-long-${uid}`;

      await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: deleteId,
            actorUrl,
            object: { id: noteId, type: "Tombstone" },
          })
        );
      await waitForProcessed(deleteId);

      assert.ok(
        await prisma.notification.findUnique({ where: { id: mention.id } })
      );
      assert.equal(
        await redisClient.exists(`ap-mention-deleted:${actorUrl}:${noteId}`),
        0
      );
    });

    it("keeps a follower who deleted one of their own posts", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.profile.create({
        data: {
          name: "Target artist",
          urlSlug: "target-artist",
          userId: user.id,
          enabled: true,
          activityPub: true,
        },
      });

      const actorUrl = `https://mastodon.social/users/postdeleter-${uid}`;
      const deletedAccountUrl = `https://mastodon.social/users/gone-${uid}`;

      await prisma.activityPubProfileFollowers.createMany({
        data: [
          {
            profileId: targetArtist.id,
            actor: actorUrl,
            inboxUrl: `${actorUrl}/inbox`,
          },
          {
            profileId: targetArtist.id,
            actor: deletedAccountUrl,
            inboxUrl: `${deletedAccountUrl}/inbox`,
          },
        ],
      });

      const postDelete = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${actorUrl}/statuses/1#delete-${uid}`,
            actorUrl,
            object: { id: `${actorUrl}/statuses/1`, type: "Tombstone" },
          })
        );
      assert.equal(postDelete.statusCode, 202);

      const accountDelete = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${deletedAccountUrl}#delete-${uid}`,
            actorUrl: deletedAccountUrl,
          })
        );
      assert.equal(accountDelete.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: deletedAccountUrl },
        });
        return r === null ? true : null;
      });

      const follower = await prisma.activityPubProfileFollowers.findFirst({
        where: { profileId: targetArtist.id, actor: actorUrl },
      });
      assert.ok(follower);
    });

    it("removes the mention but keeps the follower when a post is deleted", async () => {
      const { user } = await createUser({ email: "target@test.com" });
      const targetArtist = await createProfile(user.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });

      const actorUrl = `https://mastodon.social/users/postdeleter-${uid}`;
      const noteId = `${actorUrl}/statuses/deleted-${uid}`;

      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: targetArtist.id,
          actor: actorUrl,
          inboxUrl: `${actorUrl}/inbox`,
        },
      });
      const mention = await prisma.notification.create({
        data: {
          userId: user.id,
          profileId: targetArtist.id,
          notificationType: "AP_MENTION",
          content: "@target hello",
          metadata: { ap: { actor: actorUrl, objectId: noteId } },
        },
      });

      const response = await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${noteId}#delete`,
            actorUrl,
            object: { id: noteId, type: "Tombstone" },
          })
        );

      assert.equal(response.statusCode, 202);

      await waitFor(async () => {
        const r = await prisma.notification.findUnique({
          where: { id: mention.id },
        });
        return r === null ? true : null;
      });
      const follower = await prisma.activityPubProfileFollowers.findFirst({
        where: { profileId: targetArtist.id, actor: actorUrl },
      });
      assert(follower, "follower should be kept when only a post is deleted");
    });

    it("keeps a mention when another actor deletes an object with the same id", async () => {
      const { user } = await createUser({ email: "target@test.com" });
      const targetArtist = await createProfile(user.id, {
        urlSlug: "target-artist",
        activityPub: true,
      });

      const authorUrl = "https://mastodon.social/users/author";
      const otherUrl = `https://mastodon.social/users/someoneelse-${uid}`;
      const noteId = `${authorUrl}/statuses/kept-${uid}`;

      const mention = await prisma.notification.create({
        data: {
          userId: user.id,
          profileId: targetArtist.id,
          notificationType: "AP_MENTION",
          metadata: { ap: { actor: authorUrl, objectId: noteId } },
        },
      });
      await prisma.activityPubProfileFollowers.create({
        data: {
          profileId: targetArtist.id,
          actor: otherUrl,
          inboxUrl: `${otherUrl}/inbox`,
        },
      });

      await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${otherUrl}#delete-${uid}`,
            actorUrl: otherUrl,
            object: { id: noteId, type: "Tombstone" },
          })
        );
      await requestApp
        .post(`ap/artists/${targetArtist.urlSlug}/inbox`)
        .set("Content-Type", "application/activity+json")
        .send(
          deleteActivity({
            id: `${otherUrl}#delete-account-${uid}`,
            actorUrl: otherUrl,
          })
        );

      await waitFor(async () => {
        const r = await prisma.activityPubProfileFollowers.findFirst({
          where: { profileId: targetArtist.id, actor: otherUrl },
        });
        return r === null ? true : null;
      });
      const kept = await prisma.notification.findUnique({
        where: { id: mention.id },
      });
      assert(kept, "a Delete from another actor must not remove the mention");
    });

    it("is idempotent when the actor was never a follower", async () => {
      const user = await prisma.user.create({
        data: { email: "target@test.com" },
      });
      const targetArtist = await prisma.profile.create({
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
