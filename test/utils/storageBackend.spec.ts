import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";

import assert from "assert";

import { resolveBackendStorage } from "../../src/utils/minio";

describe("resolveBackendStorage", () => {
  it("defaults to minio when nothing is configured", () => {
    assert.equal(resolveBackendStorage(undefined, false), "minio");
  });

  it("auto-selects s3 when S3 credentials are configured", () => {
    assert.equal(resolveBackendStorage(undefined, true), "backblaze");
  });

  it("explicit minio wins over configured S3 credentials", () => {
    assert.equal(resolveBackendStorage("minio", true), "minio");
    assert.equal(resolveBackendStorage("MinIO", true), "minio");
  });

  it("accepts s3 and backblaze as aliases", () => {
    assert.equal(resolveBackendStorage("s3", false), "backblaze");
    assert.equal(resolveBackendStorage("backblaze", false), "backblaze");
    assert.equal(resolveBackendStorage("S3", false), "backblaze");
  });

  it("throws on an unrecognized value instead of silently defaulting", () => {
    assert.throws(
      () => resolveBackendStorage("minoi", false),
      /Invalid STORAGE_BACKEND/
    );
  });

  it("treats empty/whitespace as unset", () => {
    assert.equal(resolveBackendStorage("", true), "backblaze");
    assert.equal(resolveBackendStorage("  ", false), "minio");
  });
});
