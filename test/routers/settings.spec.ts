import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createSiteSettings } from "../utils";

import { requestApp } from "./utils";

describe("settings/{setting}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns null for instanceArtist when none is configured", async () => {
    await createSiteSettings({ stripe: { key: "sk_live_secret" } });

    const response = await requestApp
      .get("settings/instanceArtist")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result, null);
    assert.ok(!JSON.stringify(response.body).includes("sk_live_secret"));
  });

  it("still serves scalar settings by key", async () => {
    await createSiteSettings({ platformPercent: 12 });

    const response = await requestApp
      .get("settings/platformPercent")
      .set("Accept", "application/json");

    assert.equal(response.body.result, 12);
  });
});
