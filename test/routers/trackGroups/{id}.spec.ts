import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "../../../prisma/prisma";

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
