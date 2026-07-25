/**
 * Finds translation keys in client/src/translation/en.json that are no
 * longer referenced from client/src, and (optionally) removes them.
 *
 * en.json is the source pushed to Transifex on every push to main
 * (.github/workflows/transifex.yml runs
 * `npx txjs-cli push src/translation/en.json --parser=i18next --purge`).
 * The --purge flag makes that push delete any Transifex string that is no
 * longer present in en.json (and its translations), so removing a key here
 * and merging to main is how it gets culled from Transifex.
 *
 * Usage:
 *   yarn ts-node scripts/cull-unused-translations.ts            # dry run, lists unused keys
 *   yarn ts-node scripts/cull-unused-translations.ts --write     # also rewrites en.json
 *
 * This is a heuristic, regex-based scan (no TS/AST parsing), and it is
 * deliberately conservative: a key is only reported as unused if neither
 * a structural `t()` call match nor a plain substring search finds it
 * anywhere in client/src. Always eyeball the list (and search for the
 * user-facing text itself) before deleting anything you're unsure about,
 * since e.g. dynamically-built keys (`t(someVar)`) can't be detected here.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const EN_JSON_PATH = path.join(ROOT, "client/src/translation/en.json");
const SRC_DIR = path.join(ROOT, "client/src");
const WRITE = process.argv.includes("--write");

type Translations = Record<string, Record<string, unknown>>;

// mobileApp strings are consumed by the mobile app repo, not client/src, so
// they'd always look unused here — skip that namespace (and any dotted
// sub-namespace of it, e.g. "mobileApp.searchScreen") entirely.
function isExcludedNamespace(namespace: string): boolean {
  return namespace === "mobileApp" || namespace.startsWith("mobileApp.");
}

function flatten(translations: Translations): string[] {
  const keys: string[] = [];
  for (const [namespace, entries] of Object.entries(translations)) {
    if (isExcludedNamespace(namespace)) continue;
    for (const key of Object.keys(entries)) {
      keys.push(`${namespace}.${key}`);
    }
  }
  return keys;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "translation") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function collectUsedKeys(files: string[]): Set<string> {
  const used = new Set<string>();

  const useTranslationRe =
    /const\s*{\s*([^}]*?)\s*}\s*=\s*useTranslation\(\s*["'`][^"'`]*["'`]\s*(?:,\s*{\s*keyPrefix:\s*["'`]([^"'`]+)["'`][^}]*})?\s*\)/g;
  // any t("literal") / t('literal') / t(`literal`) call, capturing the fn name
  const tCallRe = /\b([A-Za-z0-9_$]*t)\(\s*["'`]([^"'`${}]+)["'`]/g;

  for (const file of files) {
    const contents = fs.readFileSync(file, "utf-8");

    // map of local variable name -> keyPrefix (undefined = no prefix)
    const prefixesByVar: Record<string, string | undefined> = {};
    let m: RegExpExecArray | null;

    useTranslationRe.lastIndex = 0;
    while ((m = useTranslationRe.exec(contents))) {
      const destructured = m[1];
      const keyPrefix = m[2];
      // handle `t` or `t: alias`
      for (const part of destructured.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const [orig, alias] = trimmed.split(":").map((s) => s.trim());
        if (orig === "t") {
          prefixesByVar[alias || orig] = keyPrefix;
        }
      }
    }

    // default fallback: files that just do `const { t } = useTranslation()`
    // with no captured prefix above still get an entry via the regex; but
    // guard for files using `t` without any useTranslation match in this
    // file (e.g. helper functions receiving `t` as a param) by also
    // treating a bare "t" as prefix-less if never declared.
    if (!("t" in prefixesByVar) && /\bt\(/.test(contents)) {
      prefixesByVar["t"] = undefined;
    }

    tCallRe.lastIndex = 0;
    while ((m = tCallRe.exec(contents))) {
      const fnName = m[1];
      const key = m[2];
      if (!(fnName in prefixesByVar)) continue;
      const prefix = prefixesByVar[fnName];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      used.add(fullKey);
      // also record without namespace assumption, in case key is already
      // dotted (namespace.key) and passed to a prefixed t by mistake, or
      // vice versa — belt and suspenders for the substring fallback below.
      used.add(key);
    }
  }

  return used;
}

function main() {
  const raw = fs.readFileSync(EN_JSON_PATH, "utf-8");
  const translations: Translations = JSON.parse(raw);
  const allKeys = flatten(translations);

  const files = walk(SRC_DIR);
  const structurallyUsed = collectUsedKeys(files);

  const fileContentsCache = files.map((f) => fs.readFileSync(f, "utf-8"));

  // i18next plural/context suffixes: t("count", { count }) resolves to
  // "count_one" / "count_other" / "count_zero" / "count_two" / "count_few" /
  // "count_many" at runtime, so the suffixed key itself never appears
  // verbatim in a t() call. Treat a suffixed key as used if its base key is.
  const pluralSuffixRe = /_(zero|one|two|few|many|other)$/;

  const unused: string[] = [];
  for (const fullKey of allKeys) {
    if (structurallyUsed.has(fullKey)) continue;

    const [, ...rest] = fullKey.split(".");
    const bareKey = rest.join(".");

    const pluralMatch = bareKey.match(pluralSuffixRe);
    if (pluralMatch) {
      const baseFullKey = fullKey.slice(0, -pluralMatch[0].length);
      const baseBareKey = bareKey.slice(0, -pluralMatch[0].length);
      if (
        structurallyUsed.has(baseFullKey) ||
        structurallyUsed.has(baseBareKey)
      ) {
        continue;
      }
    }

    // Fallback: does the bare key (without namespace) show up anywhere at
    // all in the source, quoted? Catches keyPrefix patterns our regex
    // missed, i18nKey props, etc. Conservative on purpose.
    const needle = `"${bareKey}"`;
    const needleAlt = `'${bareKey}'`;
    const foundLoosely = fileContentsCache.some(
      (c) => c.includes(needle) || c.includes(needleAlt)
    );
    if (foundLoosely) continue;

    if (pluralMatch) {
      const baseBareKey = bareKey.slice(0, -pluralMatch[0].length);
      const baseNeedle = `"${baseBareKey}"`;
      const baseNeedleAlt = `'${baseBareKey}'`;
      const baseFoundLoosely = fileContentsCache.some(
        (c) => c.includes(baseNeedle) || c.includes(baseNeedleAlt)
      );
      if (baseFoundLoosely) continue;
    }

    unused.push(fullKey);
  }

  if (unused.length === 0) {
    console.log("No unused translation keys found.");
    return;
  }

  console.log(`Found ${unused.length} likely-unused key(s):\n`);
  unused.forEach((k) => console.log(`  ${k}`));

  if (!WRITE) {
    console.log(
      "\nDry run only. Re-run with --write to remove these from en.json."
    );
    console.log(
      "Removed keys get purged from Transifex automatically on the next push to main\n" +
        "(.github/workflows/transifex.yml runs `txjs-cli push --purge`)."
    );
    return;
  }

  for (const fullKey of unused) {
    const [namespace, ...rest] = fullKey.split(".");
    const bareKey = rest.join(".");
    console.log(namespace, bareKey, translations[namespace]);
    delete translations[namespace][bareKey];
    if (Object.keys(translations[namespace]).length === 0) {
      delete translations[namespace];
    }
  }

  fs.writeFileSync(EN_JSON_PATH, JSON.stringify(translations, null, 2) + "\n");
  console.log(
    `\nRemoved ${unused.length} key(s) from ${path.relative(ROOT, EN_JSON_PATH)}.`
  );
  console.log(
    "Commit this change and merge to main; the transifex.yml workflow will purge\n" +
      "these strings (and their translations) from Transifex on the next push."
  );
}

main();
