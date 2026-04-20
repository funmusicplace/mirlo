import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createMerch,
  createTier,
  createTrackGroup,
  createUser,
} from "../../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/applyPlatformFee", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should cascade the artist's defaultPlatformFee to all entities", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      await prisma.artist.update({
        where: { id: artist.id },
        data: { defaultPlatformFee: 15 },
      });

      const trackGroup = await createTrackGroup(artist.id);
      const merch = await createMerch(artist.id, {});
      const tier = await createTier(artist.id);
      const tipTier = await prisma.artistTipTier.create({
        data: { name: "tips", artistId: artist.id, minAmount: 100 },
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/applyPlatformFee`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.platformPercent, 15);

      const updatedTg = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      const updatedMerch = await prisma.merch.findFirst({
        where: { id: merch.id },
      });
      const updatedTier = await prisma.artistSubscriptionTier.findFirst({
        where: { id: tier.id },
      });
      const updatedTipTier = await prisma.artistTipTier.findFirst({
        where: { id: tipTier.id },
      });

      assert.equal(updatedTg?.platformPercent, 15);
      assert.equal(updatedMerch?.platformPercent, 15);
      assert.equal(updatedTier?.platformPercent, 15);
      assert.equal(updatedTipTier?.platformPercent, 15);
    });

    it("should not update entities belonging to other artists", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await prisma.artist.update({
        where: { id: artist.id },
        data: { defaultPlatformFee: 15 },
      });

      const otherArtist = await createArtist(user.id, {
        urlSlug: "other-artist",
      });
      const otherMerch = await createMerch(otherArtist.id, {});

      const response = await requestApp
        .post(`manage/artists/${artist.id}/applyPlatformFee`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const untouched = await prisma.merch.findFirst({
        where: { id: otherMerch.id },
      });
      // The default from the Prisma schema is 7; confirm it wasn't overwritten
      // to the other artist's defaultPlatformFee of 15.
      assert.notEqual(untouched?.platformPercent, 15);
    });

    it("should reject a request from an unauthorized user", async () => {
      const { user } = await createUser({ email: "owner@testcom" });
      const artist = await createArtist(user.id);

      const { accessToken: otherAccessToken } = await createUser({
        email: "stranger@testcom",
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/applyPlatformFee`)
        .send({})
        .set("Cookie", [`jwt=${otherAccessToken}`])
        .set("Accept", "application/json");

      assert.notEqual(response.statusCode, 200);
    });
  });
});
