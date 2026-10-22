/**
 * Fails when the API stops serving a route that the Mirlo mobile app calls
 * The app lists its routes in api-endpoints.json on the main branch of funmusicplace/mirlo-mobile
 * To check a local copy, set MIRLO_MOBILE_ENDPOINTS to its absolute path or an http(s) URL
 */
import assert from "node:assert";
import { readFile } from "node:fs/promises";

import * as dotenv from "dotenv";
import { before, describe, it } from "mocha";
import request from "supertest";

dotenv.config();

type Endpoint = { method: string; path: string; sources: string[] };

const registrySource =
  process.env.MIRLO_MOBILE_ENDPOINTS ||
  "https://raw.githubusercontent.com/funmusicplace/mirlo-mobile/main/api-endpoints.json";

const api = request(process.env.API_DOMAIN);

// The API names path parameters ({id}, {userId}) and the registry writes {param}
const normalize = (path: string) => path.replace(/\{[^}]*\}/g, "{param}");

const loadRegistry = async () => {
  try {
    let text: string;
    if (/^https?:\/\//.test(registrySource)) {
      const response = await fetch(registrySource, {
        signal: AbortSignal.timeout(15_000),
      });
      assert(response.ok, `HTTP ${response.status}`);
      text = await response.text();
    } else {
      text = await readFile(registrySource, "utf8");
    }
    const { endpoints } = JSON.parse(text);
    assert(Array.isArray(endpoints) && endpoints.length, "no endpoints listed");
    return endpoints as Endpoint[];
  } catch (e: any) {
    throw new Error(
      `could not load the mirlo-mobile endpoint registry from ${registrySource}: ${e.cause ?? e.message}`
    );
  }
};

// The client fallback answers unknown paths outside /v1 with a 200 HTML page
const probe = async (method: string, path: string) => {
  const req = api[method.toLowerCase() as "get"](path);
  // Handlers that read req.body answer 500 when it is undefined
  if (method !== "GET") req.send({});
  const { status, type } = await req;
  return (
    status !== 404 &&
    status !== 405 &&
    !(status === 200 && type === "text/html")
  );
};

describe("mirlo-mobile endpoint guard", function () {
  this.timeout(30_000);

  let endpoints: Endpoint[];
  const documented = new Set<string>();

  before(async () => {
    endpoints = await loadRegistry();
    const { body } = await api.get("/v1/api-docs").expect(200);
    assert(body.paths, "GET /v1/api-docs returned no paths");
    for (const [path, item] of Object.entries<object>(body.paths)) {
      for (const method of Object.keys(item)) {
        documented.add(`${method.toUpperCase()} ${normalize(path)}`);
      }
    }
  });

  it("serves every route the app calls", async () => {
    const missing: string[] = [];
    for (const { method, path, sources } of endpoints) {
      const route = normalize(path);
      // The OpenAPI paths omit the /v1 prefix
      const isDocumented = documented.has(
        `${method} ${route.replace(/^\/v1/, "")}`
      );
      // The auth routes live outside the document and it skips some served GET
      // routes, so probe those. Writes inside /v1 are never sent
      const canProbe = method === "GET" || !route.startsWith("/v1/");
      const isServed =
        isDocumented || (canProbe && (await probe(method, route)));
      if (!isServed) {
        missing.push(`  ${method} ${path} (used by ${sources.join(", ")})`);
      }
    }
    if (missing.length) {
      assert.fail(
        `mirlo-mobile calls routes this API no longer serves:\n${missing.join("\n")}`
      );
    }
  });
});
