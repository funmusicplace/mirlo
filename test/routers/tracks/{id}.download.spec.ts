import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "@mirlo/prisma";
import { randomUUID } from "crypto";

import { requestApp } from "../utils";
import {
  createBucketIfNotExists,
  finalAudioBucket,
} from "../../../src/utils/minio";

describe("tracks/{id}/download", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("tracks/1/download")
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
        .get(`tracks/${trackGroup.id}/download`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / success without logged in user start generating", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);

      await createBucketIfNotExists(finalAudioBucket);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          pricePaid: 0,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(
          `tracks/${track.id}/download?token=${purchase.singleDownloadToken}&email=${purchaser.email}`
        )
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);

      assert.notEqual(response.body.result.jobId, undefined);

      const updatedPurchase = await prisma.userTrackPurchase.findFirst({
        where: {
          trackId: purchase.trackId,
          userId: purchase.userId,
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
      const track = await createTrack(trackGroup.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      const downloadToken = randomUUID();

      const purchase = await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          pricePaid: 0,
          singleDownloadToken: downloadToken,
        },
      });

      const response = await requestApp
        .get(`tracks/${track.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);
      assert.notEqual(response.body.result.jobId, undefined);

      const updatedPurchase = await prisma.userTrackPurchase.findFirst({
        where: {
          trackId: purchase.trackId,
          userId: purchaser.id,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, downloadToken);
    });
  });
});
