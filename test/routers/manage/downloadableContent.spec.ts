import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";

import {
  getDownloadsBucket,
  statDownloadableContent,
  uploadWrapper,
} from "../../../src/utils/minio";
import {
  clearTables,
  createArtist,
  createMerch,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const setup = async (mimeType: string, contents: Buffer) => {
  const { accessToken: adminToken } = await createUser({
    email: "admin@testcom",
    isAdmin: true,
  });
  await requestApp
    .post("admin/settings")
    .set("Cookie", [`jwt=${adminToken}`])
    .send({ bucketNames: { prefix: "" }, settings: { platformPercent: 7 } });

  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const artist = await createArtist(user.id);
  const merch = await createMerch(artist.id);
  const content = await prisma.downloadableContent.create({
    data: {
      originalFilename: "booklet.png",
      mimeType,
      size: contents.length,
      merch: { create: { merchId: merch.id } },
    },
  });
  await uploadWrapper(getDownloadsBucket(), `content/${content.id}`, contents);

  return { content, accessToken, adminToken };
};

describe("manage/downloadableContent", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("POST rejects SVG uploads", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const merch = await createMerch(artist.id);

    const response = await requestApp
      .post("manage/downloadableContent")
      .send({
        filename: "art.svg",
        mimeType: "image/svg+xml",
        size: 100,
        merchId: merch.id,
      })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
    assert.equal(await prisma.downloadableContent.count(), 0);
  });

  it("verify marks content matching its declared type as uploaded", async () => {
    const { content, accessToken } = await setup("image/png", PNG);

    const response = await requestApp
      .put(`manage/downloadableContent/${content.id}/verify`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.uploadState, "SUCCESS");
  });

  it("verify accepts PDFs saved by Illustrator", async () => {
    const { content, accessToken } = await setup(
      "application/pdf",
      Buffer.concat([
        Buffer.from("%PDF-1.7\n"),
        Buffer.alloc(1500, " "),
        Buffer.from("AIPrivateData1"),
      ])
    );

    const response = await requestApp
      .put(`manage/downloadableContent/${content.id}/verify`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.uploadState, "SUCCESS");
  });

  it("verify accepts text that starts like a binary signature", async () => {
    const { content, accessToken } = await setup(
      "text/plain",
      Buffer.from("BMX results\nID3 tags explained\n")
    );

    const response = await requestApp
      .put(`manage/downloadableContent/${content.id}/verify`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.uploadState, "SUCCESS");
  });

  it("verify deletes content that doesn't match its declared type", async () => {
    const { content, accessToken } = await setup("text/plain", PNG);

    const response = await requestApp
      .put(`manage/downloadableContent/${content.id}/verify`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
    assert.equal(
      await prisma.downloadableContent.findFirst({ where: { id: content.id } }),
      null
    );
    const { backblazeStat, minioStat } = await statDownloadableContent(
      content.id
    );
    assert.ok(!backblazeStat && !minioStat);
  });

  it("GET serves content as an attachment with the stored type", async () => {
    const { content, adminToken } = await setup("image/png", PNG);

    const response = await requestApp
      .get(`downloadableContent/${content.id}`)
      .set("Cookie", [`jwt=${adminToken}`]);

    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "image/png");
    assert.equal(
      response.headers["content-disposition"],
      'attachment; filename="booklet.png"'
    );
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  });
});
