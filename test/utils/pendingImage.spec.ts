import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";

import {
  attachPendingImage,
  clearImageSlot,
  discardPendingImage,
  isImagePending,
  markPendingImage,
} from "../../src/utils/pendingImage";
import { clearTables, createSiteSettings } from "../utils";

const createImage = (url: string[] = ["image-x1920"]) =>
  prisma.image.create({ data: { dimensions: "splash", url } });

const findSettings = () => prisma.settings.findFirstOrThrow();

const isDeleted = async (id: string) =>
  (await prisma.image.findUniqueOrThrow({ where: { id } })).deletedAt !== null;

const markPending = async (imageId: string) => {
  const { id } = await findSettings();
  await markPendingImage("SPLASH", id, imageId);
};

describe("pendingImage", () => {
  beforeEach(async () => {
    try {
      await clearTables();
      await createSiteSettings({ instanceCustomization: { title: "Mirlo" } });
    } catch (e) {
      console.error(e);
    }
  });

  it("tells whether an image is still pending", async () => {
    const image = await createImage();
    assert.equal(await isImagePending(image.id), false);

    await markPending(image.id);

    assert.equal(await isImagePending(image.id), true);
  });

  it("keeps an image a previous run already attached when the job runs again", async () => {
    const image = await createImage();
    await markPending(image.id);
    assert.equal(await attachPendingImage(image.id), true);

    assert.equal(await attachPendingImage(image.id), true);

    assert.equal((await findSettings()).splashImageId, image.id);
    assert.equal(await isDeleted(image.id), false);
  });

  it("keeps an image a previous run already attached when the job fails again", async () => {
    const image = await createImage();
    await markPending(image.id);
    await attachPendingImage(image.id);

    assert.equal(await discardPendingImage(image.id), true);

    assert.equal((await findSettings()).splashImageId, image.id);
    assert.equal(await isDeleted(image.id), false);
  });

  it("discards a pending image and keeps the current one", async () => {
    const current = await createImage(["current-x1920"]);
    await prisma.settings.updateMany({ data: { splashImageId: current.id } });
    const pending = await createImage([]);
    await markPending(pending.id);

    assert.equal(await discardPendingImage(pending.id), false);

    assert.equal(await isImagePending(pending.id), false);
    assert.equal(await isDeleted(pending.id), true);
    assert.equal((await findSettings()).splashImageId, current.id);
    assert.equal(await isDeleted(current.id), false);
  });

  it("drops an image removed by the admin when its job runs again", async () => {
    const image = await createImage();
    await markPending(image.id);
    await attachPendingImage(image.id);
    await clearImageSlot("SPLASH", (await findSettings()).id);

    assert.equal(await discardPendingImage(image.id), false);

    assert.equal((await findSettings()).splashImageId, null);
    assert.equal(await isDeleted(image.id), true);
  });

  it("drops an image replaced by a newer upload before it was attached", async () => {
    const replaced = await createImage(["replaced-x1920"]);
    await markPending(replaced.id);
    const newer = await createImage([]);
    await markPending(newer.id);

    assert.equal(await attachPendingImage(replaced.id), false);

    assert.equal(await isDeleted(replaced.id), true);
    assert.equal(await isImagePending(newer.id), true);
    assert.equal((await findSettings()).splashImageId, null);
  });
});
