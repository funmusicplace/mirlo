import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import { clearTables } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("users/{id}/tracks/{id}/audio", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404 no user", async () => {
    const response = await request(baseURL)
      .get("users/1/tracks/1/audio")
      .set("Accept", "application/json");

    assert(response.statusCode === 404);
  });
});
