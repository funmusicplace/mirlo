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
  trackFormatBucket,
  uploadWrapper,
} from "../../../src/utils/minio";
import archiver from "archiver";
import { PassThrough } from "node:stream";

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

    it("should GET / success without logged in user start generating", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);

      await createBucketIfNotExists(finalAudioBucket);
      await createBucketIfNotExists(trackFormatBucket);
      const passthrough = await generateMockArchive();
      await uploadWrapper(
        trackFormatBucket,
        `${track.id}/flac.zip`,
        passthrough
      );

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(
          `tracks/${track.id}/download?token=${purchase.singleDownloadToken}&email=${purchaser.email}`
        )
        .set("Accept", "application/json");

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(response.statusCode, 200);
    });

    it("should GET / success with logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);
      await createBucketIfNotExists(trackFormatBucket);
      const passthrough = await generateMockArchive();
      await uploadWrapper(
        trackFormatBucket,
        `${track.id}/flac.zip`,
        passthrough
      );

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      const downloadToken = randomUUID();

      await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          singleDownloadToken: downloadToken,
        },
      });

      const response = await requestApp
        .get(`tracks/${track.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(response.statusCode, 200);
    });

    it("should GET / fail if not generated without logged in user start generating", async () => {
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

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, "Need to generate track folder first");
    });

    it("should GET / fail if not generated with logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, { published: true });
      const track = await createTrack(trackGroup.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });
      const downloadToken = randomUUID();

      const purchase = await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
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
      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, "Need to generate track folder first");
    });
  });
});
