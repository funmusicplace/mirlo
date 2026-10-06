/**
 * Downloads every non-English translation from Transifex into
 * client/src/translation/<locale>.json, so they ship with the client and a
 * build without VITE_TRANSIFEX_TOKEN (e.g. a self-hosted instance) isn't
 * English-only.
 *
 * Uses the same @transifex/i18next backend the client uses at runtime, so the
 * files are in exactly the shape i18next gets from Transifex (flat dotted
 * keys, plurals already exploded into `_one`/`_other`/...).
 *
 * Run by .github/workflows/transifex-pull.yml on a schedule. By hand:
 *   TRANSIFEX_TOKEN=... yarn ts-node scripts/pull-translations.ts
 *
 * Only the public project token is needed, not the secret.
 */

import fs from "fs";
import path from "path";

import { TransifexI18next } from "@transifex/i18next";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "client/src/translation");
const SOURCE_LOCALE = "en";

const token = process.env.TRANSIFEX_TOKEN;

if (!token) {
  console.error("TRANSIFEX_TOKEN is not set");
  process.exit(1);
}

const backend = new TransifexI18next({ token });

const read = (locale: string) =>
  new Promise<Record<string, string>>((resolve, reject) => {
    backend.read(
      locale,
      "translation",
      (err: unknown, data: Record<string, string> | null) =>
        err ? reject(err) : resolve(data ?? {})
    );
  });

const sortKeys = (data: Record<string, string>) =>
  Object.fromEntries(
    Object.keys(data)
      .sort()
      .map((key) => [key, data[key]])
  );

const main = async () => {
  const languages = await backend.tx.getLanguages();
  const locales = languages
    .map((lang: { code: string }) => lang.code)
    .filter((code: string) => code && code !== SOURCE_LOCALE);

  for (const locale of locales) {
    const data = await read(locale);
    const count = Object.keys(data).length;
    if (count === 0) {
      console.log(`${locale}: no translated strings, skipping`);
      continue;
    }
    fs.writeFileSync(
      path.join(OUT_DIR, `${locale}.json`),
      JSON.stringify(sortKeys(data), null, 2) + "\n"
    );
    console.log(`${locale}: ${count} strings`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
