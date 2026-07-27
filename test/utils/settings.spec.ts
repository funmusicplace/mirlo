import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { getSiteSettings } from "../../src/utils/settings";
import { clearTables, createSiteSettings } from "../utils";

describe("getSiteSettings", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("creates a settings row with defaults when none exist", async () => {
    assert.equal(await prisma.settings.count(), 0);

    const settings = await getSiteSettings();

    assert.equal(await prisma.settings.count(), 1);
    assert.equal(settings.platformPercent, 10);
    assert.deepEqual(settings.settings?.instanceCustomization, {
      showHeroOnHome: true,
    });
    assert.deepEqual(settings.bucketNames, { prefix: "" });
    assert.ok(settings.id);
  });

  it("returns existing settings and fills missing top-level defaults", async () => {
    await createSiteSettings({
      instanceCustomization: {
        artistId: "42",
      },
    });

    const settings = await getSiteSettings();

    assert.equal(await prisma.settings.count(), 1);
    // platformPercent comes from defaultSettings when omitted from the JSON blob
    assert.equal(settings.platformPercent, 7);
    assert.deepEqual(settings.settings?.instanceCustomization, {
      artistId: "42",
    });
  });

  it("exposes row fields like cdnUrl and null bucketNames", async () => {
    const row = await createSiteSettings({ platformPercent: 8 });
    await prisma.settings.update({
      where: { id: row.id },
      data: {
        cdnUrl: "https://cdn.example.com",
        bucketNames: null,
      },
    });

    const settings = await getSiteSettings();

    assert.equal(settings.cdnUrl, "https://cdn.example.com");
    assert.equal(settings.bucketNames, null);
    assert.equal(settings.platformPercent, 8);
  });
});
