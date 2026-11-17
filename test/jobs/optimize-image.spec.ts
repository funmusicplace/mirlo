import assert from "node:assert";
import { Readable } from "node:stream";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";
import sharp from "sharp";

import optimizeImage from "../../src/jobs/optimize-image";
import {
  getImagesBucket,
  storageClient,
  uploadIncomingImageByType,
} from "../../src/utils/storage";
import { clearTables, mockJob } from "../utils";

const config = {
  webp: {
    variants: [
      { width: 120, height: 120 },
      { width: 600, height: 600 },
    ],
  },
};

const seedIncomingImage = async () => {
  const image = await prisma.image.create({ data: { dimensions: "square" } });
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await uploadIncomingImageByType("image", image.id, Readable.from(png), {
    contentType: "image/png",
  });
  return image;
};

const storedKeys = async (imageId: string) => {
  const { Contents = [] } = await storageClient!.send(
    new ListObjectsV2Command({ Bucket: getImagesBucket(), Prefix: imageId })
  );
  return Contents.flatMap(({ Key }) => (Key ? [Key] : [])).sort();
};

const runJob = (imageId: string) =>
  optimizeImage(
    mockJob({
      destinationId: imageId,
      model: "image",
      imageType: "image",
      config,
    })
  );

describe("optimize-image", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("removes the files of an image that was deleted while processing", async () => {
    const { id } = await seedIncomingImage();
    assert.deepEqual(await storedKeys(id), [id]);
    await prisma.image.delete({ where: { id } });

    const result = await runJob(id);

    assert.equal(result, undefined);
    const { url } = await prisma.image.findUniqueOrThrow({ where: { id } });
    assert.deepEqual(url, []);
    assert.deepEqual(await storedKeys(id), []);
  });
});
