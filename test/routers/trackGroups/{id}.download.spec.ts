import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { afterEach, beforeEach, describe, it } from "mocha";

import {
  createBucketIfNotExists,
  finalAudioBucket,
  uploadZip,
  setBucketConfig,
} from "../../../src/utils/minio";
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

import archiver from "archiver";

import { PassThrough } from "node:stream";

describe("trackGroups/{id}/download", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    const generateMockArchive = async () => {
      const pass = new PassThrough();

      await new Promise(async (resolve: (value?: unknown) => void) => {
        const archive = archiver("zip", {
          zlib: { level: 9 },
        });

        archive.on("finish", () => {
          resolve();
        });

        archive.pipe(pass);
        archive.finalize();
      });
      return pass;
    };

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

    it("should GET / success without logged in user start generating", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      await createBucketIfNotExists(finalAudioBucket);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(
          `trackGroups/${trackGroup.id}/download?token=${purchase.singleDownloadToken}&email=${purchaser.email}`
        )
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);

      assert.notEqual(response.body.result.jobId, undefined);

      assert.equal(response.body.message, "We've started generating the album");
    });

    it("should GET / 403 with a clear error when the album hasn't been released yet (#1773)", async () => {
      const { user } = await createUser({
        email: "preorder-artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const futureRelease = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: futureRelease,
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "preorder-purchaser@artist.com",
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(
        response.statusCode,
        403,
        "should not report a missing purchase when one exists"
      );
      assert.ok(
        typeof response.body.error === "string" &&
          response.body.error.toLowerCase().includes("isn't available"),
        `error message should mention release availability, got: ${JSON.stringify(response.body.error)}`
      );
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
      const downloadToken = randomUUID();

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: downloadToken,
        },
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);
      assert.notEqual(response.body.result.jobId, undefined);

      const updatedPurchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: purchase.trackGroupId,
          userId: purchaser.id,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, downloadToken);
    });

    it("should GET / 200 and stream zip when trackgroup is already zipped", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);

      const passthrough = await generateMockArchive();
      await uploadZip("trackGroup", trackGroup.id, "mp3-320", passthrough);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download?format=mp3-320`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.statusCode, 200);
      assert.equal(response.header["content-type"], "application/zip");
    });

    describe("consolidated mode", () => {
      let adminToken: string;

      beforeEach(async () => {
        const { accessToken } = await createUser({
          email: "admin@test.com",
          isAdmin: true,
        });
        adminToken = accessToken;
        await requestApp
          .post("admin/settings")
          .set("Cookie", [`jwt=${adminToken}`])
          .set("Accept", "application/json")
          .send({
            bucketNames: { prefix: "" },
            settings: { platformPercent: 7 },
          });
        setBucketConfig({ prefix: "" });
      });

      afterEach(async () => {
        setBucketConfig(null);
        await requestApp
          .post("admin/settings")
          .set("Cookie", [`jwt=${adminToken}`])
          .set("Accept", "application/json")
          .send({ bucketNames: null, settings: { platformPercent: 7 } });
      });

      it("serves a trackgroup zip uploaded to the consolidated bucket", async () => {
        const { user } = await createUser({ email: "artist@artist.com" });
        const artist = await createArtist(user.id);
        const trackGroup = await createTrackGroup(artist.id);
        const track = await createTrack(trackGroup.id);

        const passthrough = await generateMockArchive();
        await uploadZip("trackGroup", trackGroup.id, "mp3-320", passthrough);

        const { user: purchaser, accessToken } = await createUser({
          email: "purchaser@artist.com",
        });
        await prisma.userTrackGroupPurchase.create({
          data: {
            userId: purchaser.id,
            trackGroupId: trackGroup.id,
            singleDownloadToken: randomUUID(),
          },
        });

        const response = await requestApp
          .get(`trackGroups/${trackGroup.id}/download?format=mp3-320`)
          .set("Accept", "application/json")
          .set("Cookie", [`jwt=${accessToken}`]);

        assert.equal(response.statusCode, 200);
        assert.equal(response.header["content-type"], "application/zip");
      });
    });
  });
});
