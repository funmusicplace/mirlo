import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import cleanUpFiles from "../../src/jobs/tasks/clean-up-files";
import { clearTables } from "../utils";

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
