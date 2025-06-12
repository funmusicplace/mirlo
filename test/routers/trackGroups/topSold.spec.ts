import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";
import Parser from "rss-parser";
import { faker } from "@faker-js/faker";

describe("Top sold trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /topSold", async () => {
    const response = await requestApp
      .get("trackGroups/topSold")
      .set("Accept", "application/json");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });
});
