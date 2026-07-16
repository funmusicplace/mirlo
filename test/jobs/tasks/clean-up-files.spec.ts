import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";

import { EventEmitter } from "events";

import cleanUpFiles from "../../../src/jobs/tasks/clean-up-files";
import {
  setBucketConfig,
  minioClient,
  trackGroupFormatBucket,
} from "../../../src/utils/minio";

describe("clean-up-files", () => {
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

  afterEach(() => {
    setBucketConfig(null);
    sinon.restore();
  });

  describe("legacy mode", () => {
    it("matches legacy trackgroup bucket path", async () => {
      await cleanUpFiles(`${trackGroupFormatBucket}/42`);
      assert.equal(listObjectsV2Stub.firstCall.args[0], trackGroupFormatBucket);
      assert.equal(listObjectsV2Stub.firstCall.args[1], "42");
    });

    it("ignores consolidated path", async () => {
      await cleanUpFiles("mirlo-downloads/42");
      assert.equal(listObjectsV2Stub.callCount, 0);
    });
  });

  describe("consolidated mode", () => {
    beforeEach(() => {
      setBucketConfig({ prefix: "" });
    });

    it("matches consolidated downloads bucket path", async () => {
      await cleanUpFiles("mirlo-downloads/trackgroup/42");
      assert.equal(listObjectsV2Stub.firstCall.args[0], "mirlo-downloads");
      assert.equal(listObjectsV2Stub.firstCall.args[1], "trackgroup/42");
    });

    it("ignores legacy path", async () => {
      await cleanUpFiles(`${trackGroupFormatBucket}/42`);
      assert.equal(listObjectsV2Stub.callCount, 0);
    });
  });
});
