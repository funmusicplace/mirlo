import assert from "node:assert";
import { describe, it } from "mocha";
import request from "supertest";

describe("auth", () => {
  it.only("should POST /signup", async () => {
    const response = await request("http://localhost:3000")
      .get("/api/signup")
      .set("Accept", "application/json");

    console.log("response", response);
  });
});
