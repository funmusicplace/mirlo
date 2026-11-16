import assert from "node:assert";
import { Readable } from "node:stream";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sharp from "sharp";

import optimizeImage from "../../src/jobs/optimize-image";
import {
  getImagesBucket,
  statFile,
  uploadIncomingImageByType,
} from "../../src/utils/storage";
import { clearTables, mockJob } from "../utils";

describe("optimize-image", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const config = { webp: { variants: [{ width: 60, height: 60 }] } };

  const seedIncomingImage = async () => {
    const image = await prisma.image.create({
      data: { url: [], dimensions: "square" },
    });
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
    await uploadIncomingImageByType("image", image.id, Readable.from(buffer));
    return image;
  };

  const exists = async (key: string) =>
    !!(await statFile(getImagesBucket(), key));

  const runJob = (imageId: string) =>
    optimizeImage(
      mockJob({
        config,
        destinationId: imageId,
        model: "splashImage",
        imageType: "image",
      })
    );

  it("saves the optimized images", async () => {
    const image = await seedIncomingImage();

    await runJob(image.id);

    const saved = await prisma.image.findFirstOrThrow({
      where: { id: image.id },
    });
    assert.deepEqual(saved.url.sort(), [
      `${image.id}-original`,
      `${image.id}-x60`,
    ]);
    assert.equal(await exists(`${image.id}-x60.webp`), true);
    assert.equal(await exists(`${image.id}-original.webp`), true);
  });

  it("drops the files of an image deleted while it was processing", async () => {
    const image = await seedIncomingImage();
    await prisma.image.delete({ where: { id: image.id } });

    await runJob(image.id);

    const deleted = await prisma.image.findUniqueOrThrow({
      where: { id: image.id },
    });
    assert.deepEqual(deleted.url, []);
    assert.equal(await exists(`${image.id}-x60.webp`), false);
    assert.equal(await exists(`${image.id}-original.webp`), false);
    assert.equal(await exists(image.id), false);
  });
});
