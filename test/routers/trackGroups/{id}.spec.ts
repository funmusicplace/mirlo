import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "../../../prisma/prisma";
import { randomUUID } from "crypto";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

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

      assert(response.statusCode === 404);
    });
  });

  describe("/purchase", () => {
    it("should POST / 400 if artist not set up with stripe", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "Artist not set up with a payment processor yet"
      );
    });

    // FIXME: https://github.com/funmusicplace/mirlo/issues/248
    it.skip("should POST / 200", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
        stripeAccountId: "aRandomWord",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });
  });

  describe("/download", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("trackGroups/1/download")
        .set("Accept", "application/json");

      assert(response.statusCode === 404);
    });

    it("should GET / 404 when no purchase record found", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / success without logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          pricePaid: 0,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(
          `trackGroups/${trackGroup.id}/download?token=${purchase.singleDownloadToken}&email=${purchaser.email}`
        )
        .set("Accept", "application/json");

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(
        response.header["content-disposition"],
        `attachment; filename="Test trackGroup"`
      );
      assert.equal(response.statusCode, 200);

      const updatedPurchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: purchase.trackGroupId,
          userId: purchase.trackGroupId,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, null);
    });

    it("should GET / success with logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          pricePaid: 0,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(
        response.header["content-disposition"],
        `attachment; filename="Test trackGroup"`
      );
      assert.equal(response.statusCode, 200);

      const updatedPurchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: purchase.trackGroupId,
          userId: purchase.trackGroupId,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, null);
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
