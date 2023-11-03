import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import { clearTables } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("trackGroups/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await request(baseURL)
      .get("trackGroups/1")
      .set("Accept", "application/json");

    assert(response.statusCode === 404);
  });
});
2;
