import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables } from "../utils";

import cleanUpFiles from "../../src/jobs/clean-up-files";

describe("clean-up-trackgroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should ", async () => {
    await cleanUpFiles("some-string");
  });
});
