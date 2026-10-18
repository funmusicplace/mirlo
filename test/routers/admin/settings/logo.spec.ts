import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";
import sharp from "sharp";
import request from "supertest";

import { clearTables, createSiteSettings, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><path d="M0 0h120v40H0z"/></svg>`;

const createAdmin = async () => {
  const { accessToken } = await createUser({
    email: "admin@test.com",
    isAdmin: true,
  });
  return accessToken;
};

const uploadLogo = (
  accessToken: string,
  file: Buffer,
  filename: string,
  kind = "main"
) =>
  requestApp
    .put(`admin/settings/logo/${kind}`)
    .set("Cookie", [`jwt=${accessToken}`])
    .set("Accept", "application/json")
    .attach("upload", file, filename);

describe("admin/settings/logo/{kind}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
      await createSiteSettings({ instanceCustomization: { title: "Mirlo" } });
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("returns 401 for a non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO),
        "logo.svg"
      );

      assert.equal(response.statusCode, 401);
    });

    it("stores an SVG logo and returns it in the instance settings", async () => {
      const accessToken = await createAdmin();

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO),
        "logo.svg"
      );

      assert.equal(response.statusCode, 200);
      const { logo } = response.body.result;
      assert.match(logo.url, /\.svg$/);
      assert.equal(logo.width, 120);
      assert.equal(logo.height, 40);
      const stored = await prisma.instanceLogo.findFirstOrThrow();
      assert.equal(stored.mimeType, "image/svg+xml");
      assert.equal(stored.originalFilename, "logo.svg");
    });

    it("stores a PNG logo scaled down to fit", async () => {
      const accessToken = await createAdmin();
      const png = await sharp({
        create: { width: 1200, height: 400, channels: 3, background: "#fff" },
      })
        .png()
        .toBuffer();

      const response = await uploadLogo(accessToken, png, "logo.png");

      assert.equal(response.statusCode, 200);
      const { logo } = response.body.result;
      assert.match(logo.url, /\.png$/);
      assert.equal(logo.width, 600);
      assert.equal(logo.height, 200);
    });

    it("replaces the previous logo", async () => {
      const accessToken = await createAdmin();
      await uploadLogo(accessToken, Buffer.from(SVG_LOGO), "first.svg");
      const first = await prisma.instanceLogo.findFirstOrThrow();

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO),
        "second.svg"
      );

      assert.equal(response.statusCode, 200);
      const logos = await prisma.instanceLogo.findMany();
      assert.equal(logos.length, 1);
      assert.notEqual(logos[0].id, first.id);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.logoId, logos[0].id);
    });

    it("refuses an SVG with a script and keeps no logo", async () => {
      const accessToken = await createAdmin();

      const response = await uploadLogo(
        accessToken,
        Buffer.from(`<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>`),
        "logo.svg"
      );

      assert.equal(response.statusCode, 400);
      assert.equal(await prisma.instanceLogo.count(), 0);
    });

    it("refuses a file that is neither SVG nor PNG", async () => {
      const accessToken = await createAdmin();

      const response = await uploadLogo(
        accessToken,
        Buffer.from("GIF89a"),
        "logo.gif"
      );

      assert.equal(response.statusCode, 400);
    });

    it("stores a mobile logo next to the main one", async () => {
      const accessToken = await createAdmin();
      await uploadLogo(accessToken, Buffer.from(SVG_LOGO), "main.svg");

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO.replace("0 0 120 40", "0 0 40 40")),
        "icon.svg",
        "mobile"
      );

      assert.equal(response.statusCode, 200);
      const { logo, mobileLogo } = response.body.result;
      assert.equal(logo.width, 120);
      assert.equal(mobileLogo.width, 40);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.ok(settings.logoId);
      assert.ok(settings.mobileLogoId);
      assert.notEqual(settings.logoId, settings.mobileLogoId);
    });

    it("refuses an unknown logo kind", async () => {
      const accessToken = await createAdmin();

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO),
        "logo.svg",
        "favicon"
      );

      assert.equal(response.statusCode, 400);
    });

    it("refuses a file larger than 200 KB", async () => {
      const accessToken = await createAdmin();
      const padding = " ".repeat(210 * 1024);

      const response = await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO.replace("<path", `${padding}<path`)),
        "logo.svg"
      );

      assert.equal(response.statusCode, 413);
      assert.equal(await prisma.instanceLogo.count(), 0);
    });
  });

  it("keeps the raw logo rows out of the admin settings", async () => {
    const accessToken = await createAdmin();
    await uploadLogo(accessToken, Buffer.from(SVG_LOGO), "logo.svg");

    const response = await requestApp
      .get("admin/settings")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.logo, undefined);
    assert.equal(response.body.result.mobileLogo, undefined);
  });

  describe("DELETE", () => {
    it("removes the logo", async () => {
      const accessToken = await createAdmin();
      await uploadLogo(accessToken, Buffer.from(SVG_LOGO), "logo.svg");

      const response = await requestApp
        .delete("admin/settings/logo/main")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.logo, null);
      assert.equal(await prisma.instanceLogo.count(), 0);
    });

    it("removes only the mobile logo", async () => {
      const accessToken = await createAdmin();
      await uploadLogo(accessToken, Buffer.from(SVG_LOGO), "main.svg");
      await uploadLogo(
        accessToken,
        Buffer.from(SVG_LOGO),
        "icon.svg",
        "mobile"
      );

      const response = await requestApp
        .delete("admin/settings/logo/mobile")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.mobileLogo, null);
      assert.ok(response.body.result.logo);
      assert.equal(await prisma.instanceLogo.count(), 1);
    });

    it("succeeds when there is no logo", async () => {
      const accessToken = await createAdmin();

      const response = await requestApp
        .delete("admin/settings/logo/main")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.logo, null);
    });
  });
});
