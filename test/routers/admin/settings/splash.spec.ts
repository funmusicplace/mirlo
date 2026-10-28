import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";
import sharp from "sharp";
import request from "supertest";

import {
  createBucketIfNotExists,
  getImagesBucket,
} from "../../../../src/utils/minio";
import {
  attachPendingImage,
  markPendingImage,
} from "../../../../src/utils/pendingImage";
import { clearTables, createSiteSettings, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const createAdmin = async () => {
  const { accessToken } = await createUser({
    email: "admin@test.com",
    isAdmin: true,
  });
  return accessToken;
};

const png = () =>
  sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

const uploadSplash = (accessToken: string, file: Buffer) =>
  requestApp
    .put("admin/settings/splash")
    .set("Cookie", [`jwt=${accessToken}`])
    .set("Accept", "application/json")
    .attach("upload", file, "splash.png");

const createSplashImage = (url: string[] = ["splash-x1920"]) =>
  prisma.image.create({ data: { dimensions: "splash", url } });

const linkSplashImage = async (url?: string[]) => {
  const image = await createSplashImage(url);
  await prisma.settings.updateMany({ data: { splashImageId: image.id } });
  return image;
};

const markPendingSplashImage = async (imageId: string) => {
  const { id } = await prisma.settings.findFirstOrThrow();
  await markPendingImage("SPLASH", id, imageId);
};

const findPendingSplashImageId = async () =>
  (await prisma.pendingImage.findFirst({ where: { slot: "SPLASH" } }))
    ?.imageId ?? null;

const findImage = (id: string) =>
  prisma.image.findFirstOrThrow({ where: { id, deletedAt: { not: null } } });

describe("admin/settings/splash", () => {
  beforeEach(async () => {
    try {
      await clearTables();
      await createSiteSettings({ instanceCustomization: { title: "Mirlo" } });
      await createBucketIfNotExists(getImagesBucket());
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("returns 401 for a non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await uploadSplash(accessToken, await png());

      assert.equal(response.statusCode, 401);
    });

    it("marks the new image as pending and keeps the current one", async () => {
      const accessToken = await createAdmin();
      const current = await linkSplashImage();

      const response = await uploadSplash(accessToken, await png());

      assert.equal(response.statusCode, 200);
      const { jobId, imageId } = response.body.result;
      assert.ok(jobId);
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
      });
      assert.equal(image.dimensions, "splash");
      assert.equal(image.profileId, null);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.splashImageId, current.id);
      assert.equal(await findPendingSplashImageId(), imageId);
    });

    it("keeps the current image and leaves nothing pending when the upload fails", async () => {
      const accessToken = await createAdmin();
      const current = await linkSplashImage();

      const response = await uploadSplash(
        accessToken,
        Buffer.from("not an image")
      );

      assert.equal(response.statusCode, 406);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.splashImageId, current.id);
      assert.equal(await findPendingSplashImageId(), null);
      const live = await prisma.image.count({
        where: {
          dimensions: "splash",
          id: { not: current.id },
          deletedAt: null,
        },
      });
      assert.equal(live, 0);
    });

    it("keeps the image still being processed when another upload is refused", async () => {
      const accessToken = await createAdmin();
      const processing = await createSplashImage([]);
      await markPendingSplashImage(processing.id);

      const response = await uploadSplash(
        accessToken,
        Buffer.from("not an image")
      );

      assert.equal(response.statusCode, 406);
      assert.equal(await findPendingSplashImageId(), processing.id);
    });

    it("takes only the first file of a request", async () => {
      const accessToken = await createAdmin();

      const response = await requestApp
        .put("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .attach("upload", await png(), "first.png")
        .attach("upload", await png(), "second.png");

      assert.equal(response.statusCode, 200);
      const images = await prisma.image.findMany({
        where: { dimensions: "splash", deletedAt: null },
      });
      assert.equal(images.length, 1);
      assert.equal(images[0].originalFilename, "first.png");
    });

    it("returns 413 and keeps nothing pending when the file is too large", async () => {
      const accessToken = await createAdmin();

      const response = await uploadSplash(
        accessToken,
        Buffer.alloc(21 * 1024 * 1024)
      );

      assert.equal(response.statusCode, 413);
      assert.equal(await findPendingSplashImageId(), null);
    });

    it("returns 400 when the request is not multipart", async () => {
      const accessToken = await createAdmin();

      const response = await requestApp
        .put("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ upload: "not a file" });

      assert.equal(response.statusCode, 400);
    });

    it("returns 400 when the request holds no file", async () => {
      const accessToken = await createAdmin();

      const response = await requestApp
        .put("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .field("note", "no file");

      assert.equal(response.statusCode, 400);
    });
  });

  describe("attachPendingImage", () => {
    it("links the pending image and soft-deletes the previous one", async () => {
      const previous = await linkSplashImage(["previous-x1920"]);
      const next = await createSplashImage(["next-x1920"]);
      await markPendingSplashImage(next.id);

      await attachPendingImage(next.id);

      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.splashImageId, next.id);
      assert.equal(await findPendingSplashImageId(), null);
      await findImage(previous.id);
    });

    it("discards an image that is no longer the pending one", async () => {
      const current = await linkSplashImage();
      const cancelled = await createSplashImage(["cancelled-x1920"]);

      await attachPendingImage(cancelled.id);

      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.splashImageId, current.id);
      await findImage(cancelled.id);
    });
  });

  describe("DELETE", () => {
    it("returns 401 for a non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .delete("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("unlinks the splash image and cancels the pending one", async () => {
      const accessToken = await createAdmin();
      const image = await linkSplashImage();
      const pending = await createSplashImage(["pending-x1920"]);
      await markPendingSplashImage(pending.id);

      const response = await requestApp
        .delete("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.splashImage, null);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.splashImageId, null);
      assert.equal(await findPendingSplashImageId(), null);
      await findImage(image.id);
    });

    it("succeeds when there is no splash image", async () => {
      const accessToken = await createAdmin();

      const response = await requestApp
        .delete("admin/settings/splash")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.splashImage, null);
    });
  });

  describe("instance settings", () => {
    it("serves the splash image sizes with the texts", async () => {
      await linkSplashImage();
      await prisma.settings.updateMany({
        data: {
          settings: {
            platformPercent: 7,
            instanceCustomization: {
              title: "Mirlo",
              showHeroOnHome: true,
              showCustomSplash: true,
              splashTitle: "Hello",
              splashSubtitle: "",
            },
          },
        },
      });

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { result } = response.body;
      assert.equal(result.showCustomSplash, true);
      assert.match(result.splashImage.sizes["1920"], /\/splash-x1920/);
      assert.equal(result.splashTitle, "Hello");
      assert.equal(result.splashSubtitle, null);
      assert.equal(result.splashTextPosition, "center");
    });

    it("turns the custom splash screen off while the hero is hidden", async () => {
      await prisma.settings.updateMany({
        data: {
          settings: {
            platformPercent: 7,
            instanceCustomization: {
              title: "Mirlo",
              showHeroOnHome: false,
              showCustomSplash: true,
            },
          },
        },
      });

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.body.result.showCustomSplash, false);
    });

    it("serves no splash image without optimized sizes", async () => {
      await linkSplashImage([]);

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.body.result.splashImage, null);
    });

    it("keeps the raw splash image row out of the admin settings", async () => {
      const accessToken = await createAdmin();
      await linkSplashImage();

      const response = await requestApp
        .get("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.splashImage, undefined);
    });
  });
});
