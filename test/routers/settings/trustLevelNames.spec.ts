import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";
import request from "supertest";

import { clearTables, createSiteSettings } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("settings/trustLevelNames", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should return default names when none are configured", async () => {
    await createSiteSettings({ platformPercent: 7 });

    const response = await requestApp
      .get("settings/trustLevelNames")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result, [
      "New",
      "Verified",
      "Regular",
      "Trusted",
    ]);
  });

  it("should fill missing or blank names with defaults", async () => {
    await createSiteSettings({
      platformPercent: 7,
      trustLevelNames: ["Newcomer", "  ", "Member"],
    });

    const response = await requestApp
      .get("settings/trustLevelNames")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result, [
      "Newcomer",
      "Verified",
      "Member",
      "Trusted",
    ]);
  });
});
