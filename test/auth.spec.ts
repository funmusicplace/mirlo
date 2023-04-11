import assert from "node:assert";
import { describe, it } from "mocha";
import request from "supertest";

describe("auth", () => {
  it.only("should POST /signup", async () => {
    const response = await request(process.env.APP_HOST)
      .get("/api/signup")
      .set("Accept", "application/json");

    console.log("response", response);
  });
});
