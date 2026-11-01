import assert from "assert";

import express from "express";
import { describe, it } from "mocha";
import request from "supertest";

import wellKnown from "../src/wellKnown";

type Component = { "/": string; exclude?: boolean };

// Apple takes the first matching entry, and `*` also matches slashes
const opensApp = (components: Component[], path: string) => {
  for (const component of components) {
    const pattern = component["/"]
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    if (new RegExp(`^${pattern}$`).test(path)) return !component.exclude;
  }
  return false;
};

describe("apple-app-site-association", () => {
  const app = express();
  app.use(wellKnown);

  it("opens only the pages the mobile app can show", async () => {
    const response = await request(app).get(
      "/.well-known/apple-app-site-association"
    );

    assert.equal(
      response.headers["content-type"],
      "application/json; charset=utf-8"
    );
    const { components } = JSON.parse(response.text).applinks.details[0];
    for (const path of [
      "/",
      "/constellation",
      "/constellation/releases",
      "/jessica-moss/release/unfolding",
      "/jessica-moss/release/unfolding/tracks/27045",
    ]) {
      assert.ok(opensApp(components, path), `${path} should open the app`);
    }
    for (const path of [
      "/team/posts/806",
      "/team/merch/3",
      "/team/support/2",
      "/jessica-moss/release/unfolding/download",
      "/login",
      "/search",
      "/pages/terms",
      "/manage/artists/4/release/5",
      "/account/collection",
    ]) {
      assert.ok(
        !opensApp(components, path),
        `${path} should stay in the browser`
      );
    }
  });
});
