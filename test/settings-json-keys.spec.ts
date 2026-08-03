import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createProfile,
  createSiteSettings,
  createUser,
} from "./utils";
import { requestApp } from "./routers/utils";

const REPO_ROOT = join(__dirname, "..");
const PRISMA_JSON_TYPES = join(REPO_ROOT, "prisma", "index.ts");
const CLIENT_SETTINGS_PAGE = join(
  REPO_ROOT,
  "client",
  "src",
  "pages",
  "admin",
  "settings",
  "Index.tsx"
);
const THIS_BASENAME = basename(__filename);

/**
 * Keys that appear on settings API responses / forms but are not stored in the
 * Settings JSON column (computed or UI-only).
 */
const RESPONSE_ONLY_SETTINGS_PATHS = new Set(["stripe.keyConfigured"]);

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Parse dotted property paths from a TypeScript object-type body.
 * Walks brace depth so nested fields (e.g. instanceCustomization.artistId) are included.
 */
const parseObjectTypePaths = (body: string, prefix = ""): string[] => {
  const paths: string[] = [];
  let i = 0;
  let depth = 0;

  while (i < body.length) {
    const ch = body[i];

    if (ch === "{") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      i += 1;
      continue;
    }

    // Only consider properties at the root of *this* body.
    if (depth !== 0) {
      i += 1;
      continue;
    }

    const rest = body.slice(i);
    const match = rest.match(/^(\s*)([A-Za-z_]\w*)\s*\??\s*:\s*/);
    if (!match) {
      i += 1;
      continue;
    }

    i += match[0].length;
    const name = match[2];
    const path = prefix ? `${prefix}.${name}` : name;
    paths.push(path);

    if (body[i] === "{") {
      let innerDepth = 0;
      const start = i;
      for (; i < body.length; i++) {
        if (body[i] === "{") innerDepth += 1;
        else if (body[i] === "}") {
          innerDepth -= 1;
          if (innerDepth === 0) {
            paths.push(...parseObjectTypePaths(body.slice(start + 1, i), path));
            i += 1;
            break;
          }
        }
      }
    } else {
      while (i < body.length && body[i] !== ";") {
        i += 1;
      }
      if (body[i] === ";") i += 1;
    }
  }

  return paths;
};

const extractSettingsTypeBody = (source: string): string => {
  const start = source.match(/type\s+Settings\s*=\s*\{/);
  assert.ok(start?.index !== undefined, "PrismaJson.Settings type not found");
  let i = start.index + start[0].length;
  let depth = 1;
  const from = i;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(from, i);
    }
  }
  throw new Error("unclosed PrismaJson.Settings type");
};

const loadCanonicalSettingsPaths = (): Set<string> => {
  const source = readFileSync(PRISMA_JSON_TYPES, "utf8");
  return new Set(parseObjectTypePaths(extractSettingsTypeBody(source)));
};

type KeyUse = { file: string; path: string };

const collectSettingsKeyUses = (files: string[], roots: string[]): KeyUse[] => {
  const uses: KeyUse[] = [];
  // Match both `.key` and optional-chaining `?.key` under a settings JSON root.
  const rootAlt = roots.map(escapeRegExp).join("|");
  const accessRe = new RegExp(
    `\\b(${rootAlt})(?:\\s*\\?\\.\\s*|\\s*\\.\\s*)([A-Za-z_]\\w*)`,
    "g"
  );
  const stringPathRe = new RegExp(
    `["'\`]((?:${rootAlt})(?:\\.[A-Za-z_]\\w*)+)["'\`]`,
    "g"
  );

  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    if (rel.endsWith(THIS_BASENAME)) continue;
    const content = readFileSync(file, "utf8");

    for (const match of content.matchAll(accessRe)) {
      uses.push({ file: rel, path: `${match[1]}.${match[2]}` });
    }
    for (const match of content.matchAll(stringPathRe)) {
      uses.push({ file: rel, path: match[1] });
    }

    for (const root of roots) {
      const litRe = new RegExp(
        `\\b${escapeRegExp(root)}\\s*:\\s*\\{([^{}]*)\\}`,
        "g"
      );
      for (const match of content.matchAll(litRe)) {
        for (const key of match[1].matchAll(/\b([A-Za-z_]\w*)\s*:/g)) {
          uses.push({ file: rel, path: `${root}.${key[1]}` });
        }
      }
    }
  }
  return uses;
};

const sourceFiles = () => [
  ...listSourceFiles(join(REPO_ROOT, "src")),
  ...listSourceFiles(join(REPO_ROOT, "client", "src")),
  ...listSourceFiles(join(REPO_ROOT, "test")),
];

const settingsRoots = (canonical: Set<string>) => [
  ...new Set([...canonical].map((p) => p.split(".")[0])),
];

const isCanonicalPath = (canonical: Set<string>, path: string) => {
  const parts = path.split(".");
  for (let i = 1; i <= parts.length; i++) {
    if (!canonical.has(parts.slice(0, i).join("."))) return false;
  }
  return true;
};

describe("settings JSON key contract", () => {
  it("parses nested PrismaJson.Settings paths", () => {
    const canonical = loadCanonicalSettingsPaths();
    assert.ok(canonical.has("platformPercent"));
    assert.ok(canonical.has("instanceCustomization"));
    assert.ok(canonical.has("instanceCustomization.artistId"));
    assert.ok(canonical.has("instanceCustomization.colors.button"));
    assert.ok(canonical.has("stripe.key"));
    assert.equal(canonical.has("instanceCustomization.profileId"), false);
  });

  it("treats non-canonical keys as a contract violation", () => {
    const canonical = loadCanonicalSettingsPaths();
    assert.equal(
      isCanonicalPath(canonical, "instanceCustomization.artistId"),
      true
    );
    assert.equal(
      isCanonicalPath(canonical, "instanceCustomization.profileId"),
      false
    );
  });

  it("keeps readers/writers aligned with PrismaJson.Settings", () => {
    const canonical = loadCanonicalSettingsPaths();
    const uses = collectSettingsKeyUses(
      sourceFiles(),
      settingsRoots(canonical)
    );

    const unknown = [
      ...new Set(
        uses
          .filter(
            (u) =>
              !RESPONSE_ONLY_SETTINGS_PATHS.has(u.path) &&
              !isCanonicalPath(canonical, u.path)
          )
          .map((u) => `${u.path} (${u.file})`)
      ),
    ].sort();

    assert.deepEqual(
      unknown,
      [],
      `Settings JSON key(s) used in code but missing from PrismaJson.Settings in prisma/index.ts:\n${unknown.join("\n")}\n\nAdd the key to PrismaJson.Settings, or fix the reader/writer to use the canonical name.`
    );
  });

  it("keeps the client admin settings shape aligned with PrismaJson.Settings", () => {
    const canonical = loadCanonicalSettingsPaths();
    const clientSource = readFileSync(CLIENT_SETTINGS_PAGE, "utf8");
    const clientSettings = clientSource.match(
      /interface SettingsFromAPI\s*\{[\s\S]*?settings:\s*\{([\s\S]*?)\n  \};/
    )?.[1];
    assert.ok(clientSettings, "SettingsFromAPI.settings not found");

    const clientPaths = parseObjectTypePaths(clientSettings);
    const extra = clientPaths
      .filter((p) => !canonical.has(p) && !RESPONSE_ONLY_SETTINGS_PATHS.has(p))
      .sort();

    assert.deepEqual(
      extra,
      [],
      `Client SettingsFromAPI.settings keys missing from PrismaJson.Settings:\n${extra.join("\n")}`
    );
  });
});

describe("settings JSON behavioral readers/writers", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("reads and resolves instanceArtist via the canonical instanceCustomization.artistId key", async () => {
    const { user } = await createUser({ email: "artist@example.com" });
    const artist = await createProfile(user.id, {
      name: "Instance Artist",
      urlSlug: "instance-artist",
    });

    await createSiteSettings({
      platformPercent: 10,
      instanceCustomization: {
        artistId: `${artist.id}`,
      },
    });

    const artistIdResponse = await requestApp
      .get("settings/instanceCustomization.artistId")
      .set("Accept", "application/json");

    assert.equal(artistIdResponse.status, 200);
    assert.equal(artistIdResponse.body.result, `${artist.id}`);

    const instanceArtistResponse = await requestApp
      .get("settings/instanceArtist")
      .set("Accept", "application/json");

    assert.equal(instanceArtistResponse.status, 200);
    assert.equal(instanceArtistResponse.body.result?.id, artist.id);
  });

  it("persists canonical instanceCustomization keys through admin settings write", async () => {
    const { accessToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });
    const { user } = await createUser({ email: "artist@example.com" });
    const artist = await createProfile(user.id, {
      name: "Instance Artist",
      urlSlug: "instance-artist",
    });

    const response = await requestApp
      .post("admin/settings")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json")
      .send({
        settings: {
          platformPercent: 7,
          instanceCustomization: {
            artistId: `${artist.id}`,
            showHeroOnHome: true,
          },
        },
      });

    assert.equal(response.status, 200);

    const row = await prisma.settings.findFirst();
    const customization = (
      row?.settings as {
        instanceCustomization?: Record<string, unknown>;
      }
    )?.instanceCustomization;
    assert.equal(customization?.artistId, `${artist.id}`);
    assert.equal(customization?.showHeroOnHome, true);
  });
});
