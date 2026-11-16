import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";

import assert from "assert";

import { readStorageConfig } from "../../src/utils/storage";

describe("readStorageConfig", () => {
  it("reads the S3 variables", () => {
    const config = readStorageConfig({
      S3_ENDPOINT: "https://s3.example.com",
      S3_REGION: "fsn1",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    assert.deepEqual(config, {
      endpoint: "https://s3.example.com",
      publicEndpoint: "https://s3.example.com",
      region: "fsn1",
      credentials: { accessKeyId: "key", secretAccessKey: "secret" },
      serveImagesFromApi: false,
    });
  });

  it("defaults the region to us-east-1, even when set empty", () => {
    assert.equal(readStorageConfig({}).region, "us-east-1");
    assert.equal(readStorageConfig({ S3_REGION: "" }).region, "us-east-1");
  });

  it("keeps an explicitly empty public endpoint, which turns presigning off", () => {
    const config = readStorageConfig({
      S3_ENDPOINT: "http://garage:9000",
      S3_PUBLIC_ENDPOINT: "",
    });
    assert.equal(config.publicEndpoint, "");
  });

  it("only serves images from the API when set to true", () => {
    assert.equal(
      readStorageConfig({ SERVE_IMAGES_FROM_API: "true" }).serveImagesFromApi,
      true
    );
    assert.equal(
      readStorageConfig({ SERVE_IMAGES_FROM_API: "false" }).serveImagesFromApi,
      false
    );
  });

  it("refuses to start with leftover LOCAL_S3_* variables and no S3_ENDPOINT", () => {
    assert.throws(
      () => readStorageConfig({ LOCAL_S3_HOST: "garage" }),
      /LOCAL_S3_\* variables are no longer read/
    );
  });

  it("ignores leftover LOCAL_S3_* variables once S3_ENDPOINT is set", () => {
    assert.doesNotThrow(() =>
      readStorageConfig({
        LOCAL_S3_HOST: "garage",
        S3_ENDPOINT: "http://garage:9000",
      })
    );
  });

  it("refuses credentials without an endpoint", () => {
    assert.throws(
      () => readStorageConfig({ S3_ACCESS_KEY_ID: "key" }),
      /S3_ENDPOINT isn't/
    );
  });
});
