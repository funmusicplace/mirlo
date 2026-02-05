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
  createUserTrackPurchase,
} from "../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";

describe("trackGroups/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("trackGroups/1")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should GET / 200 with isPlayable false when user hasn't purchased", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          {
            title: "Track 1",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });

      const { accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.urlSlug}?artistId=${artist.urlSlug}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.tracks.length, 1);
      assert.equal(response.body.result.tracks[0].isPlayable, false);
    });

    it("should GET / 200 with isPlayable true when user purchased trackGroup", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      await createUserTrackGroupPurchase(purchaser.id, trackGroup.id);

      const response = await requestApp
        .get(`trackGroups/${trackGroup.urlSlug}?artistId=${artist.urlSlug}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.tracks.length, 1);
      assert.equal(response.body.result.tracks[0].isPlayable, true);
    });

    it("should GET / 200 with isPlayable true when user purchased individual track", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      await createUserTrackPurchase(purchaser.id, tracks[0].id);

      const response = await requestApp
        .get(`trackGroups/${trackGroup.urlSlug}?artistId=${artist.urlSlug}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.tracks.length, 1);
      assert.equal(response.body.result.tracks[0].isPlayable, true);
    });

    it("should GET / 200 with mixed isPlayable when user purchased only some tracks", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          {
            title: "Track 1",
            isPreview: true,
            audio: { create: { uploadState: "SUCCESS" } },
          },
          {
            title: "Track 2",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });

      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
        orderBy: { order: "asc" },
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      // Only purchase the first track
      await createUserTrackPurchase(purchaser.id, tracks[0].id);

      const response = await requestApp
        .get(`trackGroups/${trackGroup.urlSlug}?artistId=${artist.urlSlug}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.tracks.length, 2);
      assert.equal(response.body.result.tracks[0].isPlayable, true);
      assert.equal(response.body.result.tracks[1].isPlayable, false);
    });
  });

  describe("/wishlist", () => {
    it("should POST / 200 should create a wishlist item for a trackgroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/wishlist`)
        .send({ wishlist: true })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const exists = await prisma.userTrackGroupWishlist.findFirst({
        where: {
          userId: user.id,
          trackGroupId: trackGroup.id,
        },
      });

      assert.notEqual(exists, null);
    });

    it("should POST / 200 should delete a wishlist item for a trackgroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/wishlist`)
        .send({ wishlist: false })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const exists = await prisma.userTrackGroupWishlist.findFirst({
        where: {
          userId: user.id,
          trackGroupId: trackGroup.id,
        },
      });

      assert.equal(exists, null);
    });

    it("should POST / 404 if no trackgroup", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
      });

      const response = await requestApp
        .post(`trackGroups/1/wishlist`)
        .send({ wishlist: false })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 404);
    });
  });

  describe("/emailDownload", () => {
    it("should POST / 404", async () => {
      const response = await requestApp
        .post("trackGroups/1/emailDownload")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / 400 when trackGroup can't be free", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 10,
      });
      const { accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/emailDownload`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(
        response.body.error,
        "This trackGroup can't be gotten for free"
      );
      assert.equal(response.statusCode, 400);
    });

    it("should GET / 200 when trackGroup is free", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 0,
      });
      const { accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/emailDownload`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.message, "success");
      assert.equal(response.statusCode, 200);
    });
  });
});
