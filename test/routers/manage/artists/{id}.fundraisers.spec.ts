import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/fundraisers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should create a fundraiser for a track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Test Album",
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "Test Album Fundraiser");
      assert.equal(response.body.result.goalAmount, 0);

      const fundraiserInDb = await prisma.fundraiser.findFirst({
        where: { id: response.body.result.id },
        include: { trackGroups: true },
      });

      assert.equal(fundraiserInDb?.profileId, artist.id);
      assert.deepEqual(
        fundraiserInDb?.trackGroups.map((tg) => tg.id),
        [trackGroup.id]
      );
    });

    it("should return existing fundraiser if one already exists", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await createFundraiser(artist.id, {
        trackGroupId: trackGroup.id,
        name: "Existing Fundraiser",
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, fundraiser.id);
      assert.equal(response.body.result.name, "Existing Fundraiser");
    });

    it("should not attach a fundraiser to another artist's track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const artist = await createArtist(user.id);
      const otherArtist = await createArtist(otherUser.id);
      const otherTrackGroup = await createTrackGroup(otherArtist.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: otherTrackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(await prisma.fundraiser.count(), 0);
    });

    it("should return 404 if user can't edit the artist", async () => {
      const { user } = await createUser({ email: "owner@testcom" });
      const { accessToken: otherToken } = await createUser({
        email: "nonowner@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(await prisma.fundraiser.count(), 0);
    });
  });
});
