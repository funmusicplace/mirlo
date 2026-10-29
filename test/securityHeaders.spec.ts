import assert from "assert";

import express from "express";
import { describe, it } from "mocha";
import request from "supertest";

import { securityHeaders } from "../src/utils/securityHeaders";

describe("securityHeaders", () => {
  const app = express();
  app.use(securityHeaders);
  app.use((_req, res) => {
    res.send("ok");
  });

  it("sends HSTS, nosniff and a referrer policy on every response", async () => {
    const response = await request(app).get("/artist-slug");

    assert.equal(
      response.headers["strict-transport-security"],
      "max-age=31536000"
    );
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(
      response.headers["referrer-policy"],
      "strict-origin-when-cross-origin"
    );
  });
});
