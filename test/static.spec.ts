import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";
import request from "supertest";

import { Readable } from "stream";

import { serveStatic } from "../src/static";
import { minioClient } from "../src/utils/minio";

const fileContents = "file-bytes";

// Collect the raw response body regardless of content type.
const rawBody = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("serveStatic", () => {
  // Mounted the same way as in src/index.ts
  const app = express();
  app.use("/images/:bucket", serveStatic);

  let statStub: sinon.SinonStub;
  let getObjectStub: sinon.SinonStub;

  beforeEach(() => {
    statStub = sinon.stub(minioClient!, "statObject").resolves({
      size: fileContents.length,
      etag: "test-etag",
      lastModified: new Date(),
      metaData: {},
    } as any);
    getObjectStub = sinon
      .stub(minioClient!, "getObject")
      .callsFake(
        () => Promise.resolve(Readable.from([Buffer.from(fileContents)])) as any
      );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("serves a legacy flat object key", async () => {
    const response = await request(app)
      .get("/images/trackgroup-covers/some-image-x600.webp")
      .buffer(true)
      .parse(rawBody)
      .expect(200);

    assert.deepEqual(statStub.firstCall.args, [
      "trackgroup-covers",
      "some-image-x600.webp",
    ]);
    assert.equal(response.body.toString(), fileContents);
  });

  it("serves a consolidated object key containing slashes", async () => {
    await request(app)
      .get("/images/mirlo-images/trackgroup-covers/some-image-x600.webp")
      .expect(200);

    assert.deepEqual(statStub.firstCall.args, [
      "mirlo-images",
      "trackgroup-covers/some-image-x600.webp",
    ]);
  });

  it("404s when the object does not exist", async () => {
    statStub.rejects(new Error("not found"));

    await request(app).get("/images/mirlo-images/nope.webp").expect(404);
    assert.equal(getObjectStub.called, false);
  });

  it("404s when no object key is given", async () => {
    await request(app).get("/images/mirlo-images").expect(404);
    assert.equal(statStub.called, false);
  });

  it("returns 304 without a body when If-None-Match matches", async () => {
    await request(app)
      .get("/images/mirlo-images/trackgroup-covers/foo.webp")
      .set("If-None-Match", '"test-etag"')
      .expect(304);

    assert.equal(getObjectStub.called, false);
  });
});
