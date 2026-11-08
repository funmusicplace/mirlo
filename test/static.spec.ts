import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";
import request from "supertest";

import { serveStatic } from "../src/static";
import { DEFAULT_BUCKET_CONFIG, setBucketConfig } from "../src/utils/storage";

import { stubStorage } from "./utils";

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

  let storage: ReturnType<typeof stubStorage>;

  beforeEach(() => {
    storage = stubStorage({
      body: Buffer.from(fileContents),
      head: { ETag: '"test-etag"' },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("serves an object key containing slashes", async () => {
    const response = await request(app)
      .get("/images/mirlo-images/trackgroup-covers/some-image-x600.webp")
      .buffer(true)
      .parse(rawBody)
      .expect(200);

    assert.deepEqual(storage.first("HeadObjectCommand"), [
      "mirlo-images",
      "trackgroup-covers/some-image-x600.webp",
    ]);
    assert.equal(response.body.toString(), fileContents);
  });

  it("serves from a prefixed images bucket", async () => {
    setBucketConfig({ prefix: "staging-" });
    try {
      await request(app)
        .get("/images/staging-mirlo-images/some-image-x600.webp")
        .expect(200);
    } finally {
      setBucketConfig(DEFAULT_BUCKET_CONFIG);
    }

    assert.deepEqual(storage.first("HeadObjectCommand"), [
      "staging-mirlo-images",
      "some-image-x600.webp",
    ]);
  });

  it("404s for buckets other than the images bucket", async () => {
    await request(app)
      .get("/images/mirlo-downloads/trackgroup/1/flac.zip")
      .expect(404);
    await request(app)
      .get("/images/mirlo-audio/some-id/original.flac")
      .expect(404);
    await request(app)
      .get("/images/trackgroup-covers/some-image-x600.webp")
      .expect(404);

    assert.equal(storage.inputs("HeadObjectCommand").length, 0);
  });

  it("404s when the object does not exist", async () => {
    storage.options.head = Object.assign(new Error("not found"), {
      name: "NotFound",
    });

    await request(app).get("/images/mirlo-images/nope.webp").expect(404);
    assert.equal(storage.inputs("GetObjectCommand").length, 0);
  });

  it("404s when no object key is given", async () => {
    await request(app).get("/images/mirlo-images").expect(404);
    assert.equal(storage.inputs("HeadObjectCommand").length, 0);
  });

  it("sends the type from the extension and nosniff", async () => {
    const response = await request(app)
      .get("/images/mirlo-images/trackgroup-covers/foo-x600.webp")
      .expect(200);

    assert.equal(response.headers["content-type"], "image/webp");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["content-security-policy"], undefined);
  });

  it("sandboxes SVG files", async () => {
    const response = await request(app)
      .get("/images/mirlo-images/logo.svg")
      .expect(200);

    assert.equal(response.headers["content-type"], "image/svg+xml");
    assert.match(response.headers["content-security-policy"], /sandbox/);
  });

  it("falls back to a stored image type for unknown extensions", async () => {
    storage.options.head = { ETag: '"test-etag"', ContentType: "image/heic" };

    const response = await request(app)
      .get("/images/mirlo-images/photo.heic")
      .expect(200);

    assert.equal(response.headers["content-type"], "image/heic");
  });

  it("never forwards a stored non-image type", async () => {
    storage.options.head = { ETag: '"test-etag"', ContentType: "text/html" };

    const response = await request(app)
      .get("/images/mirlo-images/page.html")
      .buffer(true)
      .parse(rawBody)
      .expect(200);

    assert.doesNotMatch(response.headers["content-type"] ?? "", /text\/html/);
  });

  it("returns 304 without a body when If-None-Match matches", async () => {
    await request(app)
      .get("/images/mirlo-images/trackgroup-covers/foo.webp")
      .set("If-None-Match", '"test-etag"')
      .expect(304);

    assert.equal(storage.inputs("GetObjectCommand").length, 0);
  });
});
