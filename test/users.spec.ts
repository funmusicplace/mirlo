import assert from "node:assert";
import { describe, it } from "mocha";
import request from "supertest";

describe("api/user", () => {
  it("should GET /", async () => {
    const response = await request(process.env.APP_HOST)
      .get("/api/user")
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 3);
  });
});
