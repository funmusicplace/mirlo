import fs from "fs";
import path from "path";

import { chunk } from "lodash";

const API = "https://rest.api.transifex.com";
const EN_JSON = path.resolve(__dirname, "../client/src/translation/en.json");

const token = process.env.TRANSIFEX_API_TOKEN;
const org = process.env.TRANSIFEX_ORGANIZATION || "mirlo";
const project = process.env.TRANSIFEX_PROJECT || "mirlo";
const [locale, file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");

if (!token || !locale || !file) {
  console.error(
    "Usage: TRANSIFEX_API_TOKEN=... yarn ts-node scripts/upload-translations.ts <locale> <translations.json> [--apply]"
  );
  process.exit(1);
}

type Json = { [key: string]: string | Json };

const flatten = (obj: Json, prefix = ""): Record<string, string> =>
  Object.entries(obj).reduce(
    (acc, [key, value]) =>
      typeof value === "string"
        ? { ...acc, [prefix + key]: value }
        : { ...acc, ...flatten(value, `${prefix}${key}.`) },
    {} as Record<string, string>
  );

const request = async (
  url: string,
  init: RequestInit = {},
  attempt = 1
): Promise<any> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.api+json",
      ...init.headers,
    },
  });
  if ((res.status === 409 || res.status === 429) && attempt < 6) {
    const wait = attempt * 10;
    console.log(`${res.status}, retrying in ${wait}s`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    return request(url, init, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${await res.text()}`);
  }
  return res.json();
};

const findResource = async () => {
  const { data } = await request(
    `${API}/resources?filter[project]=o:${org}:p:${project}`
  );
  if (data.length !== 1) {
    throw new Error(`Expected one resource, found ${data.length}`);
  }
  return data[0].id;
};

const main = async () => {
  const english = flatten(JSON.parse(fs.readFileSync(EN_JSON, "utf-8")));
  const translations: Record<string, string> = JSON.parse(
    fs.readFileSync(file, "utf-8")
  );
  const resource = await findResource();

  const toUpdate: { id: string; attributes: { strings: { other: string } } }[] =
    [];
  const skipped = { alreadyTranslated: 0, sourceChanged: 0, notInFile: 0 };

  let next: string | null | undefined =
    `${API}/resource_translations?filter[resource]=${resource}` +
    `&filter[language]=l:${locale}&include=resource_string`;
  while (next) {
    const page = await request(next);
    const sources = new Map<string, any>(
      (page.included ?? []).map((s: any) => [s.id, s.attributes])
    );
    for (const row of page.data) {
      const { key, strings } = sources.get(
        row.relationships.resource_string.data.id
      );
      const translation = translations[key];
      if (!translation) {
        skipped.notInFile++;
      } else if (row.attributes.strings) {
        skipped.alreadyTranslated++;
      } else if (english[key] !== strings.other) {
        skipped.sourceChanged++;
      } else {
        toUpdate.push({
          id: row.id,
          attributes: { strings: { other: translation } },
        });
      }
    }
    next = page.links?.next;
  }

  console.log(`${toUpdate.length} to upload`, skipped);
  if (!apply) {
    console.log("Dry run, pass --apply to upload");
    return;
  }

  let uploaded = 0;
  for (const batch of chunk(toUpdate, 150)) {
    await request(`${API}/resource_translations`, {
      method: "PATCH",
      headers: { "Content-Type": 'application/vnd.api+json;profile="bulk"' },
      body: JSON.stringify({
        data: batch.map((t) => ({ ...t, type: "resource_translations" })),
      }),
    });
    uploaded += batch.length;
    console.log(`uploaded ${uploaded}/${toUpdate.length}`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
