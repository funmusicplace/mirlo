import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";

import { Readable } from "stream";
import { EventEmitter } from "events";

import {
  DEFAULT_BUCKET_CONFIG,
  setBucketConfig,
  getImagesBucket,
  getAudioBucket,
  getDownloadsBucket,
  getImagePrefix,
  imageTypeUsesQueue,
  uploadIncomingImageByType,
  downloadIncomingImageByType,
  uploadOptimizedImageByType,
  removeIncomingImageByType,
  uploadIncomingAudio,
  uploadAudioHlsFile,
  uploadZip,
  getDownloadableContentBuffer,
  getCoverBuffer,
  removeStoredImage,
  removeDownloadableContent,
  removeAudioFiles,
  minioClient,
  // Key prefix constants used in assertions
  instanceLogoPrefix,
  rootImagePrefix,
} from "../../src/utils/minio";

// Returns a Readable that ends immediately — safe to use as a fake upload stream.
function emptyReadable(): Readable {
  return new Readable({
    read() {
      this.push(null);
    },
  });
}

describe("minio bucket routing", () => {
  let putObjectStub: sinon.SinonStub;
  let getObjectStub: sinon.SinonStub;
  let removeObjectStub: sinon.SinonStub;
  let bucketExistsStub: sinon.SinonStub;

  beforeEach(() => {
    // Reset to no prefix and clear the ensured-bucket cache.
    setBucketConfig(DEFAULT_BUCKET_CONFIG);
    putObjectStub = sinon.stub(minioClient!, "putObject").resolves();
    // Each call gets a fresh stream so the 'end' event fires correctly.
    getObjectStub = sinon
      .stub(minioClient!, "getObject")
      .callsFake(() => Promise.resolve(emptyReadable()) as any);
    removeObjectStub = sinon.stub(minioClient!, "removeObject").resolves();
    bucketExistsStub = sinon.stub(minioClient!, "bucketExists").resolves(true);
  });

  afterEach(() => {
    setBucketConfig(DEFAULT_BUCKET_CONFIG);
    sinon.restore();
  });

  // ── Bucket selection helpers ─────────────────────────────────────────────────

  describe("getImagesBucket / getAudioBucket / getDownloadsBucket", () => {
    describe("no prefix", () => {
      it("routes all image traffic to mirlo-images", () => {
        assert.equal(getImagesBucket(), "mirlo-images");
      });

      it("routes all audio traffic to mirlo-audio", () => {
        assert.equal(getAudioBucket(), "mirlo-audio");
      });

      it("routes all downloads traffic to mirlo-downloads", () => {
        assert.equal(getDownloadsBucket(), "mirlo-downloads");
      });
    });

    describe("with prefix", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("prepends prefix to all bucket names", () => {
        assert.equal(getImagesBucket(), "staging-mirlo-images");
        assert.equal(getAudioBucket(), "staging-mirlo-audio");
        assert.equal(getDownloadsBucket(), "staging-mirlo-downloads");
      });
    });
  });

  // ── Image type helpers ───────────────────────────────────────────────────────

  describe("imageTypeUsesQueue", () => {
    it("returns true for images that need optimization", () => {
      assert.equal(imageTypeUsesQueue("image"), true);
    });

    it("returns false for postImage which goes straight to final storage", () => {
      assert.equal(imageTypeUsesQueue("postImage"), false);
      assert.equal(imageTypeUsesQueue("instanceLogo"), false);
    });
  });

  describe("getImagePrefix", () => {
    it("returns the key prefix for each type", () => {
      assert.equal(getImagePrefix("image"), rootImagePrefix);
      assert.equal(getImagePrefix("postImage"), rootImagePrefix);
      assert.equal(getImagePrefix("instanceLogo"), instanceLogoPrefix);
    });
  });

  // ── Image routing ────────────────────────────────────────────────────────────

  describe("image routing (no prefix)", () => {
    it("downloadIncomingImageByType(image) → mirlo-images / {id}", async () => {
      await downloadIncomingImageByType("image", "abc123");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, "abc123");
    });

    it("removeIncomingImageByType(image) → mirlo-images / {id}", async () => {
      await removeIncomingImageByType("image", "abc123");
      const [bucket, key] = removeObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, "abc123");
    });

    it("uploadOptimizedImageByType(instanceLogo) → mirlo-images / instance-logos/{filename}", async () => {
      await uploadOptimizedImageByType(
        "instanceLogo",
        "logo-id.svg",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `${instanceLogoPrefix}/logo-id.svg`);
    });

    it("uploadIncomingImageByType(postImage) → mirlo-images / {id} at the root, where it's served from", async () => {
      await uploadIncomingImageByType(
        "postImage",
        "post-id.gif",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, "post-id.gif");
    });

    it("uploadIncomingImageByType(image) → mirlo-images with NO path prefix (prefix: undefined)", async () => {
      // The generic 'image' type has prefix: undefined, so images are
      // stored at the bucket root without a path prefix.
      await uploadIncomingImageByType("image", "img-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, "img-id");
    });

    it("uploadOptimizedImageByType(image) → mirlo-images with NO path prefix", async () => {
      await uploadOptimizedImageByType(
        "image",
        "img-id-original.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, "img-id-original.webp");
    });
  });

  describe("image routing (with prefix)", () => {
    beforeEach(() => setBucketConfig({ prefix: "staging-" }));

    it("uploadOptimizedImageByType(instanceLogo) → staging-mirlo-images with correct key", async () => {
      await uploadOptimizedImageByType(
        "instanceLogo",
        "logo-id.svg",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "staging-mirlo-images");
      assert.equal(key, `${instanceLogoPrefix}/logo-id.svg`);
    });

    it("uploadIncomingImageByType(image) → staging-mirlo-images with NO path prefix", async () => {
      await uploadIncomingImageByType("image", "img-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "staging-mirlo-images");
      assert.equal(key, "img-id");
    });
  });

  // ── Audio routing ────────────────────────────────────────────────────────────

  describe("audio routing", () => {
    it("uploadIncomingAudio → mirlo-audio with incoming/ key prefix", async () => {
      await uploadIncomingAudio("audio-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-audio");
      assert.equal(key, "incoming/audio-id");
    });

    it("uploadAudioHlsFile → mirlo-audio with same id/filename key (no extra prefix)", async () => {
      await uploadAudioHlsFile("audio-id", "segment.ts", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-audio");
      assert.equal(key, "audio-id/segment.ts");
    });
  });

  // ── Zip routing ──────────────────────────────────────────────────────────────

  describe("zip routing", () => {
    it("uploadZip(trackGroup) → mirlo-downloads / trackgroup/{id}/{format}.zip", async () => {
      await uploadZip("trackGroup", 42, "mp3-320", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-downloads");
      assert.equal(key, "trackgroup/42/mp3-320.zip");
    });

    it("uploadZip(track) → mirlo-downloads / track/{id}/{format}.zip", async () => {
      await uploadZip("track", 7, "flac", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-downloads");
      assert.equal(key, "track/7/flac.zip");
    });
  });

  // ── Downloadable content routing ─────────────────────────────────────────────

  describe("downloadable content routing", () => {
    it("getDownloadableContentBuffer → mirlo-downloads / content/{id}", async () => {
      await getDownloadableContentBuffer("content-id");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-downloads");
      assert.equal(key, "content/content-id");
    });
  });

  describe("getCoverBuffer", () => {
    describe("no prefix", () => {
      it("reads a migrated cover from under its key prefix", async () => {
        await getCoverBuffer(
          { id: "cover-id", keyPrefix: "trackgroup-covers" },
          "webp"
        );
        const [bucket, key] = getObjectStub.firstCall.args;
        assert.equal(bucket, "mirlo-images");
        assert.equal(key, `trackgroup-covers/cover-id-x1500.webp`);
      });

      it("reads a new cover from the bucket root", async () => {
        await getCoverBuffer({ id: "cover-id", keyPrefix: null }, "jpg");
        const [bucket, key] = getObjectStub.firstCall.args;
        assert.equal(bucket, "mirlo-images");
        assert.equal(key, "cover-id-x1500.jpg");
      });
    });

    describe("with prefix", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("reads from staging-mirlo-images with path-prefixed key", async () => {
        await getCoverBuffer(
          { id: "cover-id", keyPrefix: "trackgroup-covers" },
          "webp"
        );
        const [bucket, key] = getObjectStub.firstCall.args;
        assert.equal(bucket, "staging-mirlo-images");
        assert.equal(key, `trackgroup-covers/cover-id-x1500.webp`);
      });
    });
  });

  describe("deletion operations", () => {
    let listObjectsV2Stub: sinon.SinonStub;
    let removeObjectsStub: sinon.SinonStub;

    beforeEach(() => {
      listObjectsV2Stub = sinon
        .stub(minioClient!, "listObjectsV2")
        .callsFake(() => {
          const emitter = new EventEmitter();
          setImmediate(() => {
            emitter.emit("data", { name: "file1" });
            emitter.emit("end");
          });
          return emitter as any;
        });
      removeObjectsStub = sinon.stub(minioClient!, "removeObjects").resolves();
    });

    describe("no prefix", () => {
      it("removeAudioFiles uses mirlo-audio with audioId prefix", async () => {
        await removeAudioFiles("audio-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-audio");
        assert.equal(listObjectsV2Stub.firstCall.args[1], "audio-id");
      });

      it("removeAudioFiles also removes the incoming upload", async () => {
        await removeAudioFiles("audio-id");
        assert.ok(
          removeObjectStub.calledWith("mirlo-audio", "incoming/audio-id")
        );
      });

      it("removeStoredImage removes a migrated image under its key prefix", async () => {
        await removeStoredImage({
          id: "cover-id",
          keyPrefix: "trackgroup-covers",
        });
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-images");
        assert.equal(
          listObjectsV2Stub.firstCall.args[1],
          `trackgroup-covers/cover-id`
        );
      });

      it("removeStoredImage removes a new image from the bucket root", async () => {
        await removeStoredImage({ id: "image-id", keyPrefix: null });
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-images");
        assert.equal(listObjectsV2Stub.firstCall.args[1], "image-id");
      });

      it("removeDownloadableContent uses mirlo-downloads with content/ prefix", async () => {
        await removeDownloadableContent("content-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-downloads");
        assert.equal(listObjectsV2Stub.firstCall.args[1], "content/content-id");
      });
    });

    describe("with prefix", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("removeAudioFiles uses staging-mirlo-audio", async () => {
        await removeAudioFiles("audio-id");
        assert.equal(
          listObjectsV2Stub.firstCall.args[0],
          "staging-mirlo-audio"
        );
      });

      it("removeStoredImage uses staging-mirlo-images", async () => {
        await removeStoredImage({
          id: "cover-id",
          keyPrefix: "trackgroup-covers",
        });
        assert.equal(
          listObjectsV2Stub.firstCall.args[0],
          "staging-mirlo-images"
        );
      });

      it("removeDownloadableContent uses staging-mirlo-downloads", async () => {
        await removeDownloadableContent("content-id");
        assert.equal(
          listObjectsV2Stub.firstCall.args[0],
          "staging-mirlo-downloads"
        );
      });
    });
  });
});
