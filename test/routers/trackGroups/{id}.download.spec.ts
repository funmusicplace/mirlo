import { randomUUID } from "crypto";
import assert from "node:assert";
import { PassThrough } from "node:stream";

import prisma from "@mirlo/prisma";
import archiver from "archiver";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  createBucketIfNotExists,
  getAudioBucket,
  uploadZip,
} from "../../../src/utils/minio";
import {
  clearTables,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / success without logged in user start generating", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      await createBucketIfNotExists(getAudioBucket());

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
      const profile = await createProfile(user.id);
      const futureRelease = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const trackGroup = await createTrackGroup(profile.id, {
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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

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
      const artist = await createProfile(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);

      const passthrough = await generateMockArchive();
      await uploadZip("trackGroup", trackGroup.id, "320.mp3", passthrough);

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
        .get(`trackGroups/${trackGroup.id}/download?format=320.mp3`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.statusCode, 200);
      assert.equal(response.header["content-type"], "application/zip");
    });

    it("honours a guest's tokenised link even when the browser is signed in as someone else", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      await createBucketIfNotExists(getAudioBucket());

      const { user: purchaser } = await createUser({
        email: "guest-purchaser@artist.com",
      });
      const downloadToken = randomUUID();
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: downloadToken,
        },
      });

      const { accessToken: bystanderToken } = await createUser({
        email: "bystander@artist.com",
      });

      const response = await requestApp
        .get(
          `trackGroups/${trackGroup.id}/download?token=${downloadToken}&email=${encodeURIComponent(purchaser.email)}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${bystanderToken}`]);

      assert.equal(response.statusCode, 200);
      assert.notEqual(response.body.result.jobId, undefined);
    });

    it("falls back to the session when the tokenised link is stale", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      await createBucketIfNotExists(getAudioBucket());

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
        .get(
          `trackGroups/${trackGroup.id}/download?token=a-stale-token&email=${encodeURIComponent(purchaser.email)}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.statusCode, 200);
      assert.notEqual(response.body.result.jobId, undefined);
    });

    it("reports why a tokenised link failed rather than a bare 404", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

      const { user: purchaser } = await createUser({
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
        .get(
          `trackGroups/${trackGroup.id}/download?token=a-stale-token&email=${encodeURIComponent(purchaser.email)}`
        )
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.ok(
        typeof response.body.error === "string" &&
          response.body.error.includes("Purchase doesn't exist"),
        `should say the purchase/token didn't resolve, got: ${JSON.stringify(response.body.error)}`
      );
    });

    it("answers the same for an unknown email as for a wrong token", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          singleDownloadToken: randomUUID(),
        },
      });

      const [known, unknown] = await Promise.all(
        [purchaser.email, "nobody@artist.com"].map((email) =>
          requestApp
            .get(`trackGroups/${trackGroup.id}/download`)
            .query({ email, token: "wrong-token" })
            .set("Accept", "application/json")
        )
      );

      assert.equal(known.statusCode, 404);
      assert.equal(unknown.statusCode, 404);
      assert.deepEqual(unknown.body, known.body);
      assert.ok(!JSON.stringify(known.body).includes(String(purchaser.id)));
    });

    describe("unreleased", () => {
      const setup = async (data: Parameters<typeof createTrackGroup>[1]) => {
        const { user } = await createUser({ email: "artist@artist.com" });
        const profile = await createProfile(user.id);
        const trackGroup = await createTrackGroup(profile.id, data);
        await createBucketIfNotExists(getAudioBucket());
        const { user: purchaser, accessToken } = await createUser({
          email: "purchaser@artist.com",
        });
        const token = randomUUID();
        await prisma.userTrackGroupPurchase.create({
          data: {
            userId: purchaser.id,
            trackGroupId: trackGroup.id,
            singleDownloadToken: token,
          },
        });
        const viaToken = () =>
          requestApp
            .get(`trackGroups/${trackGroup.id}/download`)
            .query({ email: purchaser.email, token })
            .set("Accept", "application/json");
        const viaSession = () =>
          requestApp
            .get(`trackGroups/${trackGroup.id}/download`)
            .set("Accept", "application/json")
            .set("Cookie", [`jwt=${accessToken}`]);
        return { viaToken, viaSession };
      };

      it("should not download a draft release", async () => {
        const { viaToken, viaSession } = await setup({ publishedAt: null });
        assert.equal((await viaToken()).statusCode, 404);
        assert.equal((await viaSession()).statusCode, 403);
      });

      it("should not download a pre-order before it's released", async () => {
        const { viaToken, viaSession } = await setup({ isPreorder: true });
        assert.equal((await viaToken()).statusCode, 403);
        assert.equal((await viaSession()).statusCode, 403);
      });
    });
  });
});
