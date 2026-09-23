import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";

import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";

describe("artists/{id}/redeemCode", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should POST / 404 when the artist doesn't exist", async () => {
      const response = await requestApp
        .post("artists/9999/redeemCode")
        .send({ code: "asdf", email: "purchaser@artist.com" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should POST / 404 when no code matches", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id);

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "nope", email: "purchaser@artist.com" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "Code not found or already used.");
    });

    it("should POST / fail without an email or logged in user", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "asdf" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal(
        response.body.error,
        "Need to be either logged in or supply email address"
      );
    });

    it("should POST / find the release the code belongs to", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, {
        title: "First release",
        urlSlug: "first-release",
      });
      const second = await createTrackGroup(profile.id, {
        title: "Second release",
        urlSlug: "second-release",
      });

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: second.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "asdf", email: purchaser.email })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.trackGroup.id, second.id);
      assert.equal(response.body.trackGroup.urlSlug, "second-release");
      assert.equal(response.body.user.email, purchaser.email);

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: { userId: purchaser.id },
      });

      assert.equal(purchase?.trackGroupId, second.id);
    });

    it("should POST / succeed with a logged in user", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "asdf" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.user.email, purchaser.email);
      assert.equal(response.body.trackGroup.id, trackGroup.id);
    });

    it("should POST / not redeem a code belonging to another artist", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);

      const { user: otherUser } = await createUser({
        email: "other@artist.com",
      });
      const otherProfile = await createProfile(otherUser.id, {
        urlSlug: "other-artist",
      });
      const otherTrackGroup = await createTrackGroup(otherProfile.id);

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: otherTrackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "asdf", email: "purchaser@artist.com" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "Code not found or already used.");
    });

    it("should POST / 404 when the code has already been redeemed", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
          redeemedByUserId: purchaser.id,
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/redeemCode`)
        .send({ code: "asdf", email: "someone@else.com" })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "Code not found or already used.");
    });
  });
});
