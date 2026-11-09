import * as dotenv from "dotenv";
dotenv.config();

import { afterEach, beforeEach, describe, it } from "mocha";

import assert from "assert";

import sinon from "sinon";

import cleanUpFiles from "../../../src/jobs/tasks/clean-up-files";
import { stubStorage } from "../../utils";

describe("clean-up-files", () => {
  let storage: ReturnType<typeof stubStorage>;

  beforeEach(() => {
    storage = stubStorage({ listKeys: ["file1"] });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("matches consolidated downloads bucket path", async () => {
    await cleanUpFiles("mirlo-downloads/trackgroup/42");
    assert.deepEqual(storage.first("ListObjectsV2Command"), [
      "mirlo-downloads",
      "trackgroup/42/",
    ]);
  });

  it("only removes trackgroup zips when no album id is given", async () => {
    await cleanUpFiles("mirlo-downloads/trackgroup");
    assert.deepEqual(storage.first("ListObjectsV2Command"), [
      "mirlo-downloads",
      "trackgroup/",
    ]);
  });

  it("ignores the bare downloads bucket", async () => {
    await cleanUpFiles("mirlo-downloads");
    assert.equal(storage.inputs("ListObjectsV2Command").length, 0);
  });
});
