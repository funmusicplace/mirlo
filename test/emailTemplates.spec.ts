import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { describe, it } from "mocha";

const REPO_ROOT = resolve();
const EMAILS_DIR = join(REPO_ROOT, "emails");
const en: Record<string, Record<string, unknown>> = JSON.parse(
  readFileSync(join(REPO_ROOT, "client/src/translation/en.json"), "utf8")
);

const templates = readdirSync(EMAILS_DIR, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".pug"))
  .map((file) => ({
    name: relative(REPO_ROOT, join(EMAILS_DIR, file)),
    isSubject: basename(file) === "subject.pug",
    source: readFileSync(join(EMAILS_DIR, file), "utf8"),
  }));

const callsIn = (source: string) =>
  [...source.matchAll(/\b(t|tHtml)\(\s*(["'])?([^"')]*)/g)].map((match) => ({
    fn: match[1],
    key: match[2] ? match[3] : undefined,
    before: source.slice(0, match.index),
  }));

const existsInEn = (key: string) => {
  const namespace = key.slice(0, key.lastIndexOf("."));
  const leaf = key.slice(key.lastIndexOf(".") + 1);
  const strings = en[namespace] ?? {};
  return (
    typeof strings[leaf] === "string" ||
    typeof strings[`${leaf}_other`] === "string"
  );
};

describe("email templates", () => {
  it("only use translation keys that exist in en.json", () => {
    const problems = templates.flatMap(({ name, source }) =>
      callsIn(source)
        .filter(({ key }) => key === undefined || !existsInEn(key))
        .map(({ fn, key }) =>
          key === undefined
            ? `${name}: ${fn}() needs a literal key`
            : `${name}: "${key}" is missing from en.json (keys can only be nested one level, e.g. "emails.receipt": { "title": ... })`
        )
    );
    assert.deepEqual(problems, []);
  });

  it("escape translations in HTML and only use tHtml unescaped", () => {
    const problems = templates.flatMap(({ name, isSubject, source }) =>
      callsIn(source).flatMap(({ fn, before }) => {
        const unescaped = /(!=|!\{)\s*$/.test(before);
        if (isSubject) {
          return fn === "tHtml" || !unescaped
            ? [`${name}: subjects are plain text, use != t(...)`]
            : [];
        }
        if (fn === "t" && unescaped) {
          return [
            `${name}: != t(...) skips escaping, use = t(...) or != tHtml(...)`,
          ];
        }
        if (fn === "tHtml" && !unescaped) {
          return [`${name}: tHtml returns HTML, output it with != or !{}`];
        }
        return [];
      })
    );
    assert.deepEqual(problems, []);
  });
});
