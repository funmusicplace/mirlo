import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables } from "../../utils";
import { requestApp } from "../utils";

describe("ActivityPub followers endpoint", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / ActivityPub Followers formatted correctly for no followers", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
        activityPub: true,
      },
    });

    const response = await requestApp
      .get(`ap/artists/${artist.urlSlug}/followers`)
      .set("Accept", "application/activity+json");

    assert(response.statusCode === 200);
    assert.equal(response.body.type, "OrderedCollection");
    assert.equal(response.body.totalItems, 0);
    assert(
      response.body.id.includes(`v1/ap/artists/${artist.urlSlug}/followers`)
    );
    // Fedify returns items inline (no cursor pagination), so orderedItems is
    // at the top level rather than inside a first.orderedItems page.
    assert.equal((response.body.orderedItems ?? []).length, 0);
    assert.equal(
      response.body["@context"][0],
      "https://www.w3.org/ns/activitystreams"
    );
  });

  it("should GET / ActivityPub Followers formatted correctly with followers", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
        activityPub: true,
      },
    });

    await prisma.activityPubArtistFollowers.create({
      data: {
        artistId: artist.id,
        actor: "https://mastodon.social/users/testfollower",
        inboxUrl: "https://mastodon.social/users/testfollower/inbox",
      },
    });

    const response = await requestApp
      .get(`ap/artists/${artist.urlSlug}/followers`)
      .set("Accept", "application/activity+json");

    assert(response.statusCode === 200);
    assert.equal(response.body.totalItems, 1);
    assert.equal(response.body.orderedItems.length, 1);
  });
});
