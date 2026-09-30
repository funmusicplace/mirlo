import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createSiteSettings } from "../utils";

import { requestApp } from "./utils";

describe("instance", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("returns the defaults when nothing is customised", async () => {
      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.result, {
        name: "Mirlo",
        colors: {
          button: "#be3455",
          buttonText: "#ffffff",
          background: "#ffffff",
          text: "#000000",
        },
        showHeroOnHome: true,
        isClosedToPublicArtistSignup: false,
        trustLevelNames: ["New", "Verified", "Regular", "Trusted"],
        languages: null,
      });
    });

    it("returns the customised values and no secret", async () => {
      await createSiteSettings({
        instanceCustomization: {
          title: " Nightjar ",
          supportEmail: "hello@nightjar.test",
          purchaseEmail: "orders@nightjar.test",
          artistId: "7",
          showHeroOnHome: false,
          colors: { button: "#111111", text: "#222222" },
        },
        trustLevelNames: ["Newcomer"],
        stripe: { key: "sk_live_secret", webhookConnectSigningSecret: "whsec" },
        emailProvider: { provider: "sendgrid", sendgrid: { apiKey: "SG.x" } },
        cloudflareTurnstileSecret: "0xsecret",
      });

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { result } = response.body;
      assert.equal(result.name, "Nightjar");
      assert.equal(result.showHeroOnHome, false);
      assert.deepEqual(result.colors, {
        button: "#111111",
        buttonText: "#ffffff",
        background: "#ffffff",
        text: "#222222",
      });
      assert.deepEqual(result.trustLevelNames, [
        "Newcomer",
        "Verified",
        "Regular",
        "Trusted",
      ]);
      assert.deepEqual(Object.keys(result).sort(), [
        "colors",
        "isClosedToPublicArtistSignup",
        "languages",
        "name",
        "showHeroOnHome",
        "trustLevelNames",
      ]);
      assert.ok(!JSON.stringify(response.body).includes("secret"));
    });

    it("replaces a malformed colour with the default", async () => {
      await createSiteSettings({
        instanceCustomization: {
          colors: {
            button: "red; } body { display: none } .x {",
            text: " #ABCDEF ",
          },
        },
      });

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.body.result.colors.button, "#be3455");
      assert.equal(response.body.result.colors.text, "#ABCDEF");
    });

    it("hides the hero when the setting was never saved", async () => {
      await createSiteSettings({ instanceCustomization: {} });

      const response = await requestApp
        .get("instance")
        .set("Accept", "application/json");

      assert.equal(response.body.result.showHeroOnHome, false);
    });
  });
});
