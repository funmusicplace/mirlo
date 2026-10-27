import { readFileSync, writeFileSync } from "node:fs";

const START = "<!-- summary -->";
const END = "<!-- /summary -->";
const EXISTING_SUMMARY = /\n<!-- summary -->[\s\S]*?<!-- \/summary -->\n/;

const newestEntry = (changelog) => {
  const headingStart = changelog.search(/^## /m);
  if (headingStart === -1) {
    throw new Error("CHANGELOG.md has no release entry");
  }
  const bodyStart = changelog.indexOf("\n", headingStart) + 1;
  const nextHeading = changelog.slice(bodyStart).search(/^## /m);
  const bodyEnd =
    nextHeading === -1 ? changelog.length : bodyStart + nextHeading;
  return { bodyStart, bodyEnd };
};

const changelog = readFileSync("CHANGELOG.md", "utf8");
const { bodyStart, bodyEnd } = newestEntry(changelog);

if (process.argv[2] === "notes") {
  process.stdout.write(changelog.slice(bodyStart, bodyEnd).trim() + "\n");
} else if (process.argv[2] === "changelog") {
  const body = (process.env.PR_BODY ?? "").replace(/\r\n/g, "\n");
  const start = body.indexOf(START);
  const end = body.indexOf(END, start);
  if (start === -1 || end === -1) {
    process.exit(0);
  }
  const summary = body.slice(start + START.length, end).trim();

  let entry = changelog.slice(bodyStart, bodyEnd).replace(EXISTING_SUMMARY, "");
  if (summary) {
    entry = `\n${START}\n\n${summary}\n\n${END}\n` + entry;
  }
  writeFileSync(
    "CHANGELOG.md",
    changelog.slice(0, bodyStart) + entry + changelog.slice(bodyEnd)
  );
} else {
  throw new Error("Usage: release-summary.mjs changelog|notes");
}
