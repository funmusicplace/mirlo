import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";

import { requestApp } from "../utils";
import Parser from "rss-parser";
import { faker } from "@faker-js/faker";

describe("Top sold trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /topSold", async () => {
    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });

  it("should GET /topSold with 1 trackGroup", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test2@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);

    await createUserTrackGroupPurchase(user2.id, trackGroup.id);

    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, trackGroup.title);
    assert(response.statusCode === 200);
  });

  it("should GET /topSold not get without tracks", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    await createTrackGroup(artist.id, {
      tracks: [],
    });
    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 0);
    assert(response.statusCode === 200);
  });

  it("should GET /topSold not get an unpublished", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    await createTrackGroup(artist.id, { published: false });
    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results, 0);
    assert(response.statusCode === 200);
  });

  // NEEDS EDITING
  it("should GET /topSold in descending order of number of purchases", async () => {
    const { user: user1 } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test1@test.com" });
    const artist1 = await createArtist(user1.id);
    const artist2 = await createArtist(user1.id);

    const { user: buyer1 } = await createUser({ email: "test2@test.com" });
    const { user: buyer2 } = await createUser({ email: "test3@test.com" });
    const { user: buyer3 } = await createUser({ email: "test4@test.com" });
    const { user: buyer4 } = await createUser({ email: "test5@test.com" });
    const { user: buyer5 } = await createUser({ email: "test6@test.com" });

    const buyers = {
      0: buyer1,
      1: buyer2,
      2: buyer3,
      3: buyer4,
      4: buyer5,
    };

    const mostPurchased = await createTrackGroup(artist1.id, {
      title: "most purchased",
    });
    const secondPurchased = await createTrackGroup(artist1.id, {
      title: "2nd most purchased",
      urlSlug: "a-oldest-album",
    });
    const leastPurchased = await createTrackGroup(artist1.id, {
      title: "least purchased",
    });

    const thirdPurchased = await createTrackGroup(artist2.id, {
      title: "3rd most purchased",
    });

    for (let i = 0; i < 5; i++) {
      await createUserTrackGroupPurchase(
        buyers[i as keyof typeof buyers].id,
        mostPurchased.id
      );
    }

    for (let i = 0; i < 4; i++) {
      await createUserTrackGroupPurchase(
        buyers[i as keyof typeof buyers].id,
        secondPurchased.id
      );
    }
    for (let i = 0; i < 3; i++) {
      await createUserTrackGroupPurchase(
        buyers[i as keyof typeof buyers].id,
        thirdPurchased.id
      );
    }
    for (let i = 0; i < 2; i++) {
      await createUserTrackGroupPurchase(
        buyers[i as keyof typeof buyers].id,
        leastPurchased.id
      );
    }

    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results[0].id, mostPurchased.id);
    assert.equal(response.body.results[1].id, secondPurchased.id);
    assert.equal(response.body.results[2].id, thirdPurchased.id);
    assert.equal(response.body.results[3].id, leastPurchased.id);

    assert(response.statusCode === 200);
  });
});
