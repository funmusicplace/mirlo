import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";

import { Readable } from "stream";
import { EventEmitter } from "events";

import {
  setBucketConfig,
  getImagesBucket,
  getAudioBucket,
  getDownloadsBucket,
  getImageFinalBucket,
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
  removeCoverImages,
  removeDownloadableContent,
  removeAudioFiles,
  minioClient,
  // Bucket name constants used in assertions
  incomingArtistAvatarBucket,
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  incomingUserAvatarBucket,
  finalUserAvatarBucket,
  incomingCoversBucket,
  finalCoversBucket,
  finalPostImageBucket,
  incomingImageBucket,
  finalImageBucket,
  incomingAudioBucket,
  finalAudioBucket,
  trackGroupFormatBucket,
  trackFormatBucket,
  downloadableContentBucket,
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
    // Reset to legacy mode and clear the ensured-bucket cache.
    setBucketConfig(null);
    putObjectStub = sinon.stub(minioClient!, "putObject").resolves();
    // Each call gets a fresh stream so the 'end' event fires correctly.
    getObjectStub = sinon
      .stub(minioClient!, "getObject")
      .callsFake(() => Promise.resolve(emptyReadable()) as any);
    removeObjectStub = sinon.stub(minioClient!, "removeObject").resolves();
    bucketExistsStub = sinon.stub(minioClient!, "bucketExists").resolves(true);
  });

  afterEach(() => {
    setBucketConfig(null);
    sinon.restore();
  });

  // ── Bucket selection helpers ─────────────────────────────────────────────────

  describe("getImagesBucket / getAudioBucket / getDownloadsBucket", () => {
    it("legacy mode: returns the legacy fallback bucket unchanged", () => {
      assert.equal(getImagesBucket("artist-avatars"), "artist-avatars");
      assert.equal(
        getAudioBucket("incoming-track-audio"),
        "incoming-track-audio"
      );
      assert.equal(getAudioBucket(), finalAudioBucket);
      assert.equal(
        getDownloadsBucket("trackgroup-format"),
        "trackgroup-format"
      );
    });

    describe("consolidated mode (no prefix)", () => {
      beforeEach(() => setBucketConfig({ prefix: "" }));

      it("routes all image traffic to mirlo-images regardless of fallback", () => {
        assert.equal(getImagesBucket("artist-avatars"), "mirlo-images");
        assert.equal(getImagesBucket("incoming-covers"), "mirlo-images");
      });

      it("routes all audio traffic to mirlo-audio", () => {
        assert.equal(getAudioBucket(), "mirlo-audio");
        assert.equal(getAudioBucket("incoming-track-audio"), "mirlo-audio");
      });

      it("routes all downloads traffic to mirlo-downloads", () => {
        assert.equal(
          getDownloadsBucket("trackgroup-format"),
          "mirlo-downloads"
        );
        assert.equal(getDownloadsBucket("track-format"), "mirlo-downloads");
      });
    });

    describe("consolidated mode (with prefix)", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("prepends prefix to all consolidated bucket names", () => {
        assert.equal(getImagesBucket("anything"), "staging-mirlo-images");
        assert.equal(getAudioBucket(), "staging-mirlo-audio");
        assert.equal(getDownloadsBucket("anything"), "staging-mirlo-downloads");
      });
    });
  });

  // ── Image type helpers ───────────────────────────────────────────────────────

  describe("imageTypeUsesQueue", () => {
    it("returns true for all standard image types that need optimization", () => {
      assert.equal(imageTypeUsesQueue("artistAvatar"), true);
      assert.equal(imageTypeUsesQueue("artistBackground"), true);
      assert.equal(imageTypeUsesQueue("userAvatar"), true);
      assert.equal(imageTypeUsesQueue("userBanner"), true);
      assert.equal(imageTypeUsesQueue("trackGroupCover"), true);
      assert.equal(imageTypeUsesQueue("merch"), true);
      assert.equal(imageTypeUsesQueue("image"), true);
    });

    it("returns false for postImage which goes straight to final storage", () => {
      assert.equal(imageTypeUsesQueue("postImage"), false);
    });
  });

  describe("getImageFinalBucket", () => {
    it("returns the correct final bucket name for each type", () => {
      assert.equal(
        getImageFinalBucket("artistAvatar"),
        finalArtistAvatarBucket
      );
      assert.equal(
        getImageFinalBucket("artistBackground"),
        finalArtistBackgroundBucket
      );
      assert.equal(getImageFinalBucket("trackGroupCover"), finalCoversBucket);
      assert.equal(getImageFinalBucket("image"), finalImageBucket);
      assert.equal(getImageFinalBucket("postImage"), finalPostImageBucket);
    });
  });

  // ── Image routing: legacy mode ───────────────────────────────────────────────

  describe("image routing: legacy mode", () => {
    it("uploadIncomingImageByType(artistAvatar) → incoming-artist-avatars with bare key", async () => {
      await uploadIncomingImageByType(
        "artistAvatar",
        "abc123",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, incomingArtistAvatarBucket);
      assert.equal(key, "abc123");
    });

    it("downloadIncomingImageByType(artistAvatar) → incoming-artist-avatars with bare key", async () => {
      await downloadIncomingImageByType("artistAvatar", "abc123");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, incomingArtistAvatarBucket);
      assert.equal(key, "abc123");
    });

    it("uploadOptimizedImageByType(artistAvatar) → artist-avatars with bare key", async () => {
      await uploadOptimizedImageByType(
        "artistAvatar",
        "abc123-x500.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, finalArtistAvatarBucket);
      assert.equal(key, "abc123-x500.webp");
    });

    it("removeIncomingImageByType(artistAvatar) → incoming-artist-avatars with bare key", async () => {
      await removeIncomingImageByType("artistAvatar", "abc123");
      const [bucket, key] = removeObjectStub.firstCall.args;
      assert.equal(bucket, incomingArtistAvatarBucket);
      assert.equal(key, "abc123");
    });

    it("uploadIncomingImageByType(trackGroupCover) → incoming-covers bucket", async () => {
      await uploadIncomingImageByType(
        "trackGroupCover",
        "cover-id",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, incomingCoversBucket);
      assert.equal(key, "cover-id");
    });

    it("uploadOptimizedImageByType(trackGroupCover) → trackgroup-covers bucket", async () => {
      await uploadOptimizedImageByType(
        "trackGroupCover",
        "cover-id-x1500.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, finalCoversBucket);
      assert.equal(key, "cover-id-x1500.webp");
    });

    it("uploadIncomingImageByType(postImage) → post-images bucket (no separate incoming bucket)", async () => {
      await uploadIncomingImageByType("postImage", "post-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, finalPostImageBucket);
      assert.equal(key, "post-id");
    });

    it("uploadIncomingImageByType(image) → incoming-mirlo-images bucket", async () => {
      await uploadIncomingImageByType("image", "img-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, incomingImageBucket);
      assert.equal(key, "img-id");
    });

    it("downloadIncomingImageByType(userAvatar) reads from incoming-artist-avatars, not incoming-user-avatars", async () => {
      // userAvatar shares the artist-avatars incoming bucket intentionally;
      // this test guards against the old bug where the final bucket was used as incoming.
      await downloadIncomingImageByType("userAvatar", "user-id");
      const [bucket] = getObjectStub.firstCall.args;
      assert.equal(bucket, incomingArtistAvatarBucket);
      assert.notEqual(bucket, incomingUserAvatarBucket);
      assert.notEqual(bucket, finalUserAvatarBucket);
    });
  });

  // ── Image routing: consolidated mode ────────────────────────────────────────

  describe("image routing: consolidated mode (no prefix)", () => {
    beforeEach(() => setBucketConfig({ prefix: "" }));

    it("uploadIncomingImageByType(artistAvatar) → mirlo-images / incoming/{prefix}/{id}", async () => {
      await uploadIncomingImageByType(
        "artistAvatar",
        "abc123",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `incoming/${finalArtistAvatarBucket}/abc123`);
    });

    it("downloadIncomingImageByType(artistAvatar) → mirlo-images / incoming/{prefix}/{id}", async () => {
      await downloadIncomingImageByType("artistAvatar", "abc123");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `incoming/${finalArtistAvatarBucket}/abc123`);
    });

    it("uploadOptimizedImageByType(artistAvatar) → mirlo-images / {prefix}/{filename}", async () => {
      await uploadOptimizedImageByType(
        "artistAvatar",
        "abc123-x500.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `${finalArtistAvatarBucket}/abc123-x500.webp`);
    });

    it("removeIncomingImageByType(artistAvatar) → mirlo-images / incoming/{prefix}/{id}", async () => {
      await removeIncomingImageByType("artistAvatar", "abc123");
      const [bucket, key] = removeObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `incoming/${finalArtistAvatarBucket}/abc123`);
    });

    it("uploadIncomingImageByType(image) → mirlo-images with NO path prefix (prefix: undefined)", async () => {
      // The generic 'image' type has prefix: undefined — even in consolidated mode,
      // images are stored at the bucket root without a path prefix.
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

    it("uploadIncomingImageByType(trackGroupCover) → mirlo-images / incoming/{prefix}/{id}", async () => {
      await uploadIncomingImageByType(
        "trackGroupCover",
        "cover-id",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `incoming/${finalCoversBucket}/cover-id`);
    });

    it("uploadOptimizedImageByType(trackGroupCover) → mirlo-images / {prefix}/{filename}", async () => {
      await uploadOptimizedImageByType(
        "trackGroupCover",
        "cover-id-x1500.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `${finalCoversBucket}/cover-id-x1500.webp`);
    });

    it("uploadIncomingImageByType(userAvatar) → mirlo-images / incoming/{finalUserAvatarBucket}/{id}", async () => {
      await uploadIncomingImageByType("userAvatar", "user-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-images");
      assert.equal(key, `incoming/${finalUserAvatarBucket}/user-id`);
    });
  });

  describe("image routing: consolidated mode (with prefix)", () => {
    beforeEach(() => setBucketConfig({ prefix: "staging-" }));

    it("uploadIncomingImageByType(artistAvatar) → staging-mirlo-images with correct key", async () => {
      await uploadIncomingImageByType(
        "artistAvatar",
        "abc123",
        emptyReadable()
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "staging-mirlo-images");
      assert.equal(key, `incoming/${finalArtistAvatarBucket}/abc123`);
    });

    it("uploadOptimizedImageByType(trackGroupCover) → staging-mirlo-images with correct key", async () => {
      await uploadOptimizedImageByType(
        "trackGroupCover",
        "cover-id-x1500.webp",
        Buffer.alloc(0)
      );
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "staging-mirlo-images");
      assert.equal(key, `${finalCoversBucket}/cover-id-x1500.webp`);
    });

    it("uploadIncomingImageByType(image) → staging-mirlo-images with NO path prefix", async () => {
      await uploadIncomingImageByType("image", "img-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, "staging-mirlo-images");
      assert.equal(key, "img-id");
    });
  });

  // ── Audio routing ────────────────────────────────────────────────────────────

  describe("audio routing: legacy mode", () => {
    it("uploadIncomingAudio → incoming-track-audio with bare key", async () => {
      await uploadIncomingAudio("audio-id", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, incomingAudioBucket);
      assert.equal(key, "audio-id");
    });

    it("uploadAudioHlsFile → track-audio with id/filename key", async () => {
      await uploadAudioHlsFile("audio-id", "segment.ts", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, finalAudioBucket);
      assert.equal(key, "audio-id/segment.ts");
    });
  });

  describe("audio routing: consolidated mode", () => {
    beforeEach(() => setBucketConfig({ prefix: "" }));

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

  describe("zip routing: legacy mode", () => {
    it("uploadZip(trackGroup) → trackgroup-format / {id}/{format}.zip", async () => {
      await uploadZip("trackGroup", 42, "mp3-320", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, trackGroupFormatBucket);
      assert.equal(key, "42/mp3-320.zip");
    });

    it("uploadZip(track) → track-format / {id}/{format}.zip", async () => {
      await uploadZip("track", 7, "flac", emptyReadable());
      const [bucket, key] = putObjectStub.firstCall.args;
      assert.equal(bucket, trackFormatBucket);
      assert.equal(key, "7/flac.zip");
    });
  });

  describe("zip routing: consolidated mode", () => {
    beforeEach(() => setBucketConfig({ prefix: "" }));

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

  describe("downloadable content routing: legacy mode", () => {
    it("getDownloadableContentBuffer → mirlo-downloadable-content with bare key", async () => {
      await getDownloadableContentBuffer("content-id");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, downloadableContentBucket);
      assert.equal(key, "content-id");
    });
  });

  describe("downloadable content routing: consolidated mode", () => {
    beforeEach(() => setBucketConfig({ prefix: "" }));

    it("getDownloadableContentBuffer → mirlo-downloads / content/{id}", async () => {
      await getDownloadableContentBuffer("content-id");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, "mirlo-downloads");
      assert.equal(key, "content/content-id");
    });
  });

  describe("getCoverBuffer", () => {
    it("legacy mode: reads from finalCoversBucket with bare key", async () => {
      await getCoverBuffer("cover-id", "webp");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, finalCoversBucket);
      assert.equal(key, "cover-id-x1500.webp");
    });

    it("legacy mode: reads jpg from finalCoversBucket with bare key", async () => {
      await getCoverBuffer("cover-id", "jpg");
      const [bucket, key] = getObjectStub.firstCall.args;
      assert.equal(bucket, finalCoversBucket);
      assert.equal(key, "cover-id-x1500.jpg");
    });

    describe("consolidated mode (no prefix)", () => {
      beforeEach(() => setBucketConfig({ prefix: "" }));

      it("reads from mirlo-images with path-prefixed key", async () => {
        await getCoverBuffer("cover-id", "webp");
        const [bucket, key] = getObjectStub.firstCall.args;
        assert.equal(bucket, "mirlo-images");
        assert.equal(key, `${finalCoversBucket}/cover-id-x1500.webp`);
      });
    });

    describe("consolidated mode (with prefix)", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("reads from staging-mirlo-images with path-prefixed key", async () => {
        await getCoverBuffer("cover-id", "webp");
        const [bucket, key] = getObjectStub.firstCall.args;
        assert.equal(bucket, "staging-mirlo-images");
        assert.equal(key, `${finalCoversBucket}/cover-id-x1500.webp`);
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

    describe("legacy mode", () => {
      it("removeAudioFiles uses finalAudioBucket with audioId prefix", async () => {
        await removeAudioFiles("audio-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], finalAudioBucket);
        assert.equal(listObjectsV2Stub.firstCall.args[1], "audio-id");
      });

      it("removeCoverImages uses finalCoversBucket with coverId prefix", async () => {
        await removeCoverImages("cover-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], finalCoversBucket);
        assert.equal(listObjectsV2Stub.firstCall.args[1], "cover-id");
      });

      it("removeDownloadableContent uses downloadableContentBucket with contentId prefix", async () => {
        await removeDownloadableContent("content-id");
        assert.equal(
          listObjectsV2Stub.firstCall.args[0],
          downloadableContentBucket
        );
        assert.equal(listObjectsV2Stub.firstCall.args[1], "content-id");
      });
    });

    describe("consolidated mode", () => {
      beforeEach(() => setBucketConfig({ prefix: "" }));

      it("removeAudioFiles uses mirlo-audio with audioId prefix", async () => {
        await removeAudioFiles("audio-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-audio");
        assert.equal(listObjectsV2Stub.firstCall.args[1], "audio-id");
      });

      it("removeCoverImages uses mirlo-images with prefixed coverId", async () => {
        await removeCoverImages("cover-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-images");
        assert.equal(
          listObjectsV2Stub.firstCall.args[1],
          `${finalCoversBucket}/cover-id`
        );
      });

      it("removeDownloadableContent uses mirlo-downloads with content/ prefix", async () => {
        await removeDownloadableContent("content-id");
        assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-downloads");
        assert.equal(listObjectsV2Stub.firstCall.args[1], "content/content-id");
      });
    });

    describe("consolidated mode (with prefix)", () => {
      beforeEach(() => setBucketConfig({ prefix: "staging-" }));

      it("removeAudioFiles uses staging-mirlo-audio", async () => {
        await removeAudioFiles("audio-id");
        assert.equal(
          listObjectsV2Stub.firstCall.args[0],
          "staging-mirlo-audio"
        );
      });

      it("removeCoverImages uses staging-mirlo-images", async () => {
        await removeCoverImages("cover-id");
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
