import assert from "node:assert";
import { Prisma } from "@mirlo/prisma/client";
import prisma from "../../../prisma/prisma";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
  createUserTrackPurchase,
} from "../../utils";

import { requestApp } from "../utils";

describe("top sold tracks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /topSold", async () => {
    const response = await requestApp
      .get("tracks/topSold")
      .set("Accept", "application/json");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });

  it("should GET /topSold with 1 track", async () => {
    const { user } = await createUser({
      email: "artist@artist.com",
    });
    const { user: buyer } = await createUser({
      email: "buyer@test.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "This is a test description",
    });

    await createUserTrackPurchase(buyer.id, track.id);

    const response = await requestApp
      .get("tracks/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, track.title);
    assert.equal(response.statusCode, 200);
  });

  it("should GET /topSold in descending order of number of purchases", async () => {
    const { user: user1 } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test1@test.com" });
    const artist1 = await createArtist(user1.id);
    const artist2 = await createArtist(user2.id, { urlSlug: "artist-2" });

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

    const trackGroup1 = await createTrackGroup(artist1.id, {
      title: "most purchased",
      urlSlug: "most-purchased",
    });

    const trackGroup2 = await createTrackGroup(artist2.id, {
      title: "least purchased",
      urlSlug: "least-purchased",
    });

    const mostPurchased = await createTrack(trackGroup1.id, {
      title: "most",
      description: "most",
    });
    const middlePurchased = await createTrack(trackGroup2.id, {
      title: "middle",
      description: "middle",
    });
    const leastPurchased = await createTrack(trackGroup1.id, {
      title: "least",
      description: "least",
    });

    for (let i = 0; i < 4; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        mostPurchased.id
      );
    }

    for (let i = 0; i < 3; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        middlePurchased.id
      );
    }
    for (let i = 0; i < 1; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        leastPurchased.id
      );
    }

    const response = await requestApp
      .get("tracks/topSold")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 3);
    assert.equal(response.body.results[0].id, mostPurchased.id);
    assert.equal(response.body.results[1].id, middlePurchased.id);
    assert.equal(response.body.results[2].id, leastPurchased.id);

    assert(response.statusCode === 200);
  });

  it("should GET /topSold the queried number of top sold purchases in descending order", async () => {
    const { user: user1 } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test1@test.com" });
    const artist1 = await createArtist(user1.id);
    const artist2 = await createArtist(user2.id, { urlSlug: "artist-2" });

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
    };

    const trackGroup1 = await createTrackGroup(artist1.id, {
      title: "most purchased",
      urlSlug: "most-purchased",
    });

    const trackGroup2 = await createTrackGroup(artist2.id, {
      title: "least purchased",
      urlSlug: "least-purchased",
    });

    const mostPurchased = await createTrack(trackGroup1.id, {
      title: "most",
      description: "most",
    });
    const middlePurchased = await createTrack(trackGroup2.id, {
      title: "middle",
      description: "middle",
    });
    const leastPurchased = await createTrack(trackGroup1.id, {
      title: "least",
      description: "least",
    });

    for (let i = 0; i < 4; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        mostPurchased.id
      );
    }

    for (let i = 0; i < 3; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        middlePurchased.id
      );
    }
    for (let i = 0; i < 1; i++) {
      await createUserTrackPurchase(
        buyers[i as keyof typeof buyers].id,
        leastPurchased.id
      );
    }

    const response = await requestApp
      .get("tracks/topSold")
      .query("take=2")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 2);
    assert.equal(response.body.results[0].id, mostPurchased.id);
    assert.equal(response.body.results[1].id, middlePurchased.id);

    assert(response.statusCode === 200);
  });
});
