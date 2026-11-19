import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";

import { clearTables, createSiteSettings, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const FONTS_DIR = join(__dirname, "../../../../client/public/fonts");
const WOFF2_FONT = readFileSync(join(FONTS_DIR, "cubano-sharp.woff2"));
const OTF_FONT = readFileSync(join(FONTS_DIR, "cubano-sharp.otf"));

const OS2_WEIGHT_OFFSET = 4;
const OS2_FS_TYPE_OFFSET = 8;
const FS_TYPE_NO_EMBEDDING = 0x0002;

const withOs2Field = (font: Buffer, fieldOffset: number, value: number) => {
  const copy = Buffer.from(font);
  const numTables = copy.readUInt16BE(4);
  for (let index = 0; index < numTables; index++) {
    const record = 12 + index * 16;
    if (copy.toString("latin1", record, record + 4) === "OS/2") {
      copy.writeUInt16BE(value, copy.readUInt32BE(record + 8) + fieldOffset);
    }
  }
  return copy;
};

const BOLD_OTF_FONT = withOs2Field(OTF_FONT, OS2_WEIGHT_OFFSET, 700);
const NO_EMBEDDING_OTF_FONT = withOs2Field(
  OTF_FONT,
  OS2_FS_TYPE_OFFSET,
  FS_TYPE_NO_EMBEDDING
);
const FONT_COLLECTION = Buffer.concat([Buffer.from("ttcf"), Buffer.alloc(64)]);
const DAMAGED_OTF_FONT = OTF_FONT.subarray(0, 512);

const createFontWithFiles = (count: number) =>
  prisma.font.create({
    data: {
      name: "Poster",
      category: "sans",
      files: {
        create: Array.from({ length: count }, (_, index) => ({
          format: "woff2" as const,
          weightMin: (index + 1) * 100,
          weightMax: (index + 1) * 100,
          style: "normal" as const,
          scripts: [],
          byteSize: 1000,
        })),
      },
    },
    include: { files: true },
  });

const errorOf = (response: request.Response) => [
  response.statusCode,
  response.body.error,
];

const createAdmin = async () => {
  const { accessToken } = await createUser({
    email: "admin@test.com",
    isAdmin: true,
  });
  return accessToken;
};

const uploadFont = (
  accessToken: string,
  files: { buffer: Buffer; filename: string }[]
) => {
  let pending = requestApp
    .post("admin/settings/fonts")
    .set("Cookie", [`jwt=${accessToken}`])
    .set("Accept", "application/json");
  for (const file of files) {
    pending = pending.attach("upload", file.buffer, file.filename);
  }
  return pending;
};

describe("admin/settings/fonts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
      await createSiteSettings({ instanceCustomization: { title: "Mirlo" } });
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("returns 401 for a non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      assert.equal(response.statusCode, 401);
    });

    it("stores a font and reads its name, weight, style, scripts and fallback from the file", async () => {
      const accessToken = await createAdmin();

      const response = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      assert.equal(response.statusCode, 200);
      const font = response.body.result;
      assert.equal(font.name, "Cubano");
      assert.equal(font.family, `mi-font-${font.id}`);
      assert.equal(font.stack, `"mi-font-${font.id}", sans-serif`);
      assert.ok(font.css.includes(`font-family: "mi-font-${font.id}"`));
      assert.equal(font.files.length, 1);
      assert.equal(font.files[0].format, "woff2");
      assert.equal(font.files[0].weightMin, 400);
      assert.equal(font.files[0].weightMax, 400);
      assert.equal(font.files[0].style, "normal");
      assert.ok(font.files[0].scripts.includes("latin"));
      assert.equal(typeof font.files[0].ascentOverride, "number");
      assert.equal(typeof font.files[0].descentOverride, "number");
      assert.ok(font.files[0].url.endsWith(`.woff2`));
      assert.ok(font.files[0].url.includes(`fonts/${font.id}/`));
    });

    it("serves the font files from the API origin with a font content type", async () => {
      const accessToken = await createAdmin();
      const created = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);
      const { url } = created.body.result.files[0];
      const apiRequest = request(`${process.env.API_DOMAIN}`);

      assert.ok(
        url.startsWith(`${process.env.API_DOMAIN?.replace(/\/+$/, "")}/images/`)
      );
      const served = await apiRequest.get(new URL(url).pathname);
      const missing = await apiRequest.get(
        new URL(url).pathname.replace(/[^/]+$/, `${randomUUID()}.ttf`)
      );

      assert.equal(served.statusCode, 200);
      assert.equal(served.headers["content-type"], "font/woff2");
      assert.equal(missing.statusCode, 404);
      assert.ok(!String(missing.headers["content-type"]).includes("text/html"));
    });

    it("refuses a file that is not a font", async () => {
      const accessToken = await createAdmin();

      const response = await uploadFont(accessToken, [
        { buffer: Buffer.from("<svg></svg>"), filename: "logo.svg" },
      ]);

      assert.deepEqual(errorOf(response), [
        400,
        "logo.svg is not a WOFF2, WOFF, TTF or OTF font file.",
      ]);
      assert.equal(await prisma.font.count(), 0);
    });

    it("returns 413 for a file over the size limit", async () => {
      const accessToken = await createAdmin();

      const response = await uploadFont(accessToken, [
        { buffer: Buffer.alloc(2 * 1024 * 1024), filename: "huge.woff2" },
      ]);

      assert.deepEqual(errorOf(response), [
        413,
        "huge.woff2 is larger than 1.5 MB.",
      ]);
      assert.equal(await prisma.font.count(), 0);
    });

    it("refuses a font once the library is full", async () => {
      const accessToken = await createAdmin();
      await prisma.font.createMany({
        data: Array.from({ length: 10 }, (_, index) => ({
          name: `Font ${index}`,
          category: "sans" as const,
        })),
      });

      const response = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      assert.deepEqual(errorOf(response), [
        400,
        "The library can hold at most 10 fonts. Delete one first.",
      ]);
      assert.equal(await prisma.font.count(), 10);
    });

    it("refuses two files covering the same weight and style", async () => {
      const accessToken = await createAdmin();

      const response = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
        { buffer: OTF_FONT, filename: "cubano.otf" },
      ]);

      assert.deepEqual(errorOf(response), [
        400,
        "cubano.otf covers the same weight and style as cubano.woff2.",
      ]);
      assert.equal(await prisma.font.count(), 0);
    });

    it("refuses a request without a font file", async () => {
      const accessToken = await createAdmin();

      const responses = await Promise.all([
        requestApp
          .post("admin/settings/fonts")
          .set("Cookie", [`jwt=${accessToken}`])
          .field("name", "Poster"),
        requestApp
          .post("admin/settings/fonts")
          .set("Cookie", [`jwt=${accessToken}`])
          .send({ name: "Poster" }),
      ]);

      assert.deepEqual(responses.map(errorOf), [
        [400, "Add at least one font file."],
        [400, "Send the font files as multipart form data."],
      ]);
      assert.equal(await prisma.font.count(), 0);
    });

    it("refuses more files than a font can hold", async () => {
      const accessToken = await createAdmin();

      const response = await uploadFont(
        accessToken,
        Array.from({ length: 9 }, (_, index) => ({
          buffer: withOs2Field(OTF_FONT, OS2_WEIGHT_OFFSET, (index + 1) * 100),
          filename: `cubano-${index}.otf`,
        }))
      );

      assert.deepEqual(errorOf(response), [
        400,
        "A font can have at most 8 files.",
      ]);
      assert.equal(await prisma.font.count(), 0);
      assert.equal(await prisma.fontFile.count(), 0);
    });

    it("refuses font collections, damaged files and fonts that forbid embedding", async () => {
      const accessToken = await createAdmin();

      const responses = await Promise.all([
        uploadFont(accessToken, [
          { buffer: FONT_COLLECTION, filename: "family.ttc" },
        ]),
        uploadFont(accessToken, [
          { buffer: DAMAGED_OTF_FONT, filename: "damaged.otf" },
        ]),
        uploadFont(accessToken, [
          { buffer: NO_EMBEDDING_OTF_FONT, filename: "restricted.otf" },
        ]),
      ]);

      assert.deepEqual(responses.map(errorOf), [
        [
          400,
          "family.ttc is a font collection. Upload each font of the collection as its own file.",
        ],
        [400, "damaged.otf is not a WOFF2, WOFF, TTF or OTF font file."],
        [
          400,
          "The license of restricted.otf does not allow embedding it in web pages.",
        ],
      ]);
      assert.equal(await prisma.font.count(), 0);
      assert.equal(await prisma.fontFile.count(), 0);
    });
  });

  describe("GET", () => {
    it("lists the fonts of the library", async () => {
      const accessToken = await createAdmin();
      await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      const response = await requestApp
        .get("admin/settings/fonts")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "Cubano");
    });
  });

  describe("{fontId}", () => {
    it("returns 404 for an unknown font", async () => {
      const accessToken = await createAdmin();

      const responses = await Promise.all(
        ["not-a-uuid", randomUUID()].map((fontId) =>
          requestApp
            .delete(`admin/settings/fonts/${fontId}`)
            .set("Cookie", [`jwt=${accessToken}`])
        )
      );

      assert.deepEqual(responses.map(errorOf), [
        [404, "This font does not exist."],
        [404, "This font does not exist."],
      ]);
    });

    it("deletes a font and puts the text that used it back on the default font", async () => {
      const accessToken = await createAdmin();
      const created = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);
      const fontId = created.body.result.id;
      const { id } = await prisma.settings.findFirstOrThrow();
      await prisma.settings.update({
        where: { id },
        data: { headingFontId: fontId, bodyFontId: fontId },
      });

      const response = await requestApp
        .delete(`admin/settings/fonts/${fontId}`)
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.statusCode, 200);
      assert.equal(await prisma.font.count(), 0);
      assert.equal(await prisma.fontFile.count(), 0);
      const settings = await prisma.settings.findFirstOrThrow();
      assert.equal(settings.headingFontId, null);
      assert.equal(settings.bodyFontId, null);
    });
  });

  describe("{fontId}/files", () => {
    it("adds a weight to a font, then removes it", async () => {
      const accessToken = await createAdmin();
      const created = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);
      const fontId = created.body.result.id;

      const added = await requestApp
        .post(`admin/settings/fonts/${fontId}/files`)
        .set("Cookie", [`jwt=${accessToken}`])
        .attach("upload", BOLD_OTF_FONT, "cubano-bold.otf");

      assert.equal(added.statusCode, 200);
      assert.deepEqual(
        added.body.result.files.map(
          (file: { weightMin: number; format: string }) => [
            file.weightMin,
            file.format,
          ]
        ),
        [
          [400, "woff2"],
          [700, "otf"],
        ]
      );
      assert.ok(added.body.result.css.includes("font-weight: 700"));

      const bold = added.body.result.files[1];
      const removed = await requestApp
        .delete(`admin/settings/fonts/${fontId}/files/${bold.id}`)
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(removed.statusCode, 200);
      assert.equal(removed.body.result.files.length, 1);
      assert.equal(await prisma.fontFile.count(), 1);
    });

    it("returns 404 for a file of another font", async () => {
      const accessToken = await createAdmin();
      const first = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
        { buffer: BOLD_OTF_FONT, filename: "cubano-bold.otf" },
      ]);
      const second = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      const response = await requestApp
        .delete(
          `admin/settings/fonts/${second.body.result.id}/files/${first.body.result.files[0].id}`
        )
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.deepEqual(errorOf(response), [
        404,
        "This font file does not exist.",
      ]);
      assert.equal(await prisma.fontFile.count(), 3);
    });

    it("refuses a file whose weight and style the font already has", async () => {
      const accessToken = await createAdmin();
      const created = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);

      const response = await requestApp
        .post(`admin/settings/fonts/${created.body.result.id}/files`)
        .set("Cookie", [`jwt=${accessToken}`])
        .attach("upload", OTF_FONT, "cubano.otf");

      assert.deepEqual(errorOf(response), [
        400,
        "cubano.otf covers the same weight and style as cubano.woff2.",
      ]);
      assert.equal(await prisma.fontFile.count(), 1);
    });

    it("refuses to remove the last file of a font", async () => {
      const accessToken = await createAdmin();
      const created = await uploadFont(accessToken, [
        { buffer: WOFF2_FONT, filename: "cubano.woff2" },
      ]);
      const font = created.body.result;

      const response = await requestApp
        .delete(`admin/settings/fonts/${font.id}/files/${font.files[0].id}`)
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.deepEqual(errorOf(response), [
        400,
        "A font needs at least one file. Delete the whole font instead.",
      ]);
      assert.equal(await prisma.fontFile.count(), 1);
    });

    it("returns 404 for the files of an unknown font", async () => {
      const accessToken = await createAdmin();

      const responses = await Promise.all([
        requestApp
          .post(`admin/settings/fonts/${randomUUID()}/files`)
          .set("Cookie", [`jwt=${accessToken}`])
          .attach("upload", BOLD_OTF_FONT, "cubano-bold.otf"),
        requestApp
          .delete(`admin/settings/fonts/${randomUUID()}/files/${randomUUID()}`)
          .set("Cookie", [`jwt=${accessToken}`]),
      ]);

      assert.deepEqual(responses.map(errorOf), [
        [404, "This font does not exist."],
        [404, "This font does not exist."],
      ]);
      assert.equal(await prisma.fontFile.count(), 0);
    });

    it("refuses a file once the font has the maximum number of files", async () => {
      const accessToken = await createAdmin();
      const font = await createFontWithFiles(8);

      const response = await requestApp
        .post(`admin/settings/fonts/${font.id}/files`)
        .set("Cookie", [`jwt=${accessToken}`])
        .attach(
          "upload",
          withOs2Field(OTF_FONT, OS2_WEIGHT_OFFSET, 900),
          "cubano-black.otf"
        );

      assert.deepEqual(errorOf(response), [
        400,
        "A font can have at most 8 files.",
      ]);
      assert.equal(await prisma.fontFile.count(), 8);
    });
  });

  describe("access", () => {
    it("returns 401 to a non-admin user on every route", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });
      const font = await prisma.font.create({
        data: {
          name: "Poster",
          category: "sans",
          files: {
            create: [
              {
                format: "woff2",
                weightMin: 400,
                weightMax: 400,
                style: "normal",
                scripts: [],
                byteSize: 1000,
              },
            ],
          },
        },
        include: { files: true },
      });
      const cookie = [`jwt=${accessToken}`];

      const responses = await Promise.all([
        requestApp.get("admin/settings/fonts").set("Cookie", cookie),
        requestApp
          .delete(`admin/settings/fonts/${font.id}`)
          .set("Cookie", cookie),
        requestApp
          .post(`admin/settings/fonts/${font.id}/files`)
          .set("Cookie", cookie)
          .attach("upload", BOLD_OTF_FONT, "cubano-bold.otf"),
        requestApp
          .delete(`admin/settings/fonts/${font.id}/files/${font.files[0].id}`)
          .set("Cookie", cookie),
      ]);

      assert.deepEqual(
        responses.map((response) => response.statusCode),
        [401, 401, 401, 401]
      );
      assert.equal(await prisma.font.count(), 1);
      assert.equal(await prisma.fontFile.count(), 1);
    });
  });
});
