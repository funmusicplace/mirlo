import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createPost,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

describe("ActivityPub outbox endpoint", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("pages through posts and releases in date order", async () => {
    const { user } = await createUser({
      email: "test@test.com",
      canCreateArtists: true,
    });
    const artist = await createProfile(user.id, {
      urlSlug: "test-artist",
      activityPub: true,
    });

    for (let i = 0; i < 25; i++) {
      await createPost(artist.id, {
        title: `Post ${i}`,
        isDraft: false,
        publishedAt: day(i * 2),
      });
    }
    for (let i = 0; i < 3; i++) {
      await createTrackGroup(artist.id, {
        title: `Album ${i}`,
        releaseDate: day(i * 10 + 1),
      });
    }

    const collection = await requestApp
      .get(`ap/artists/${artist.urlSlug}/outbox`)
      .set("Accept", "application/activity+json");
    assert.equal(collection.statusCode, 200);
    assert.equal(collection.body.totalItems, 28);

    const first = await requestApp
      .get(`ap/artists/${artist.urlSlug}/outbox?cursor=0`)
      .set("Accept", "application/activity+json");
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.orderedItems.length, 20);
    assert(first.body.next.endsWith("cursor=20"));

    const second = await requestApp
      .get(`ap/artists/${artist.urlSlug}/outbox?cursor=20`)
      .set("Accept", "application/activity+json");
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.orderedItems.length, 8);
    assert.equal(second.body.next, undefined);

    const items = [...first.body.orderedItems, ...second.body.orderedItems];
    const ids = items.map((item) => item.object.id);
    assert.equal(new Set(ids).size, 28);
    assert.equal(
      items.filter((item) => item.object.type === "Audio").length,
      3
    );
    const published = items.map((item) => Date.parse(item.published));
    assert.deepEqual(
      published,
      [...published].sort((a, b) => b - a)
    );
  });
});
