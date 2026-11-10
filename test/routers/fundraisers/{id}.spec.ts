import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
  createFundraiserPledge,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("fundraisers/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setUp = async (
    fundraiserData: Parameters<typeof createFundraiser>[1] = {}
  ) => {
    const { user } = await createUser({ email: "artist@example.com" });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id, { urlSlug: "tidal-hours" });
    const fundraiser = await createFundraiser(artist.id, {
      name: "A van",
      urlSlug: "a-van",
      isPublic: true,
      isAllOrNothing: true,
      goalAmount: 100000,
      ...fundraiserData,
    });
    return { artist, backer, fundraiser };
  };

  it("finds a public fundraiser by the artist's and the fundraiser's slugs", async () => {
    const { backer, fundraiser } = await setUp();
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 2500 });

    const response = await requestApp
      .get("fundraisers/A-Van?artistId=tidal-hours")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.id, fundraiser.id);
    assert.equal(response.body.result.artist.urlSlug, "tidal-hours");
    assert.equal(response.body.result.amountRaised, 2500);
    assert.equal(response.body.result.pledgeCount, 1);
    assert.deepEqual(response.body.result.images, []);
    assert.equal(response.body.result.artist.apPrivateKey, undefined);
  });

  it("finds a public fundraiser by id", async () => {
    const { fundraiser } = await setUp();

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.urlSlug, "a-van");
  });

  it("hides fundraisers that aren't public", async () => {
    const { fundraiser } = await setUp({ isPublic: false });

    for (const path of [
      `fundraisers/${fundraiser.id}`,
      "fundraisers/a-van?artistId=tidal-hours",
    ]) {
      const response = await requestApp
        .get(path)
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404, path);
    }
  });

  it("hides fundraisers of disabled artists and deleted fundraisers", async () => {
    const { artist, fundraiser } = await setUp();
    await prisma.profile.update({
      where: { id: artist.id },
      data: { enabled: false },
    });
    const disabled = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");
    assert.equal(disabled.statusCode, 404);

    await prisma.profile.update({
      where: { id: artist.id },
      data: { enabled: true },
    });
    await prisma.fundraiser.delete({ where: { id: fundraiser.id } });
    const deleted = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");
    assert.equal(deleted.statusCode, 404);
  });

  it("doesn't find another artist's fundraiser by slug", async () => {
    await setUp();
    const { user } = await createUser({ email: "other@example.com" });
    await createArtist(user.id, { urlSlug: "other-artist" });

    const response = await requestApp
      .get("fundraisers/a-van?artistId=other-artist")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });
});
