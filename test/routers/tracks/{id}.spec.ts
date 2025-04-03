import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables } from "../../utils";

import { requestApp } from "../utils";

describe("tracks/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("tracks/1")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });
  });
});
