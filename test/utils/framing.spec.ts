import assert from "assert";

import express from "express";
import { describe, it } from "mocha";
import request from "supertest";

import { denyFramingExceptWidgets } from "../../src/utils/framing";

describe("denyFramingExceptWidgets", () => {
  const app = express();
  app.use(denyFramingExceptWidgets);
  app.use((_req, res) => {
    res.send("ok");
  });

  it("lets widget views be framed", async () => {
    for (const path of [
      "/widget/trackGroup/1",
      "/widget/trackgroup/1",
      "/widget/track/1",
      "/widget/post/1",
    ]) {
      const response = await request(app).get(path);
      assert.equal(response.headers["content-security-policy"], undefined);
      assert.equal(response.headers["x-frame-options"], undefined);
    }
  });

  it("refuses framing everywhere else", async () => {
    for (const path of [
      "/",
      "/login",
      "/v1/artists",
      "/widgets",
      "/a/widget/",
    ]) {
      const response = await request(app).get(path);
      assert.equal(
        response.headers["content-security-policy"],
        "frame-ancestors 'none'"
      );
      assert.equal(response.headers["x-frame-options"], "DENY");
    }
  });
});
