import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables } from "../utils";

import cleanUpFiles from "../../src/jobs/tasks/clean-up-files";
import {
  cleanUpOldFilesQueue,
  cleanUpOldFilesEvents,
} from "../../src/queues/clean-up-old-files-queue";

describe("clean-up-trackgroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  after(async () => {
    // Gotta make sure to close the queues and queue events
    await cleanUpOldFilesQueue.close();
    await cleanUpOldFilesEvents.close();
  });

  it("should ", async () => {
    await cleanUpFiles("some-string");
  });
});
