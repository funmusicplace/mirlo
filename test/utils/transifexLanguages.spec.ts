import assert from "assert";

import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";

import {
  __resetAvailableLanguagesForTests,
  aggregateLanguageStats,
  getAvailableLanguages,
  getThresholdPercent,
  languageCodeFromStat,
  nativeLanguageName,
  refreshAvailableLanguages,
} from "../../src/utils/transifexLanguages";

const stat = (
  resource: string,
  lang: string,
  translated: number,
  total: number
) => ({
  id: `o:mirlo:p:mirlo:r:${resource}:l:${lang}`,
  attributes: { translated_strings: translated, total_strings: total },
  relationships: { language: { data: { id: `l:${lang}` } } },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });

describe("transifexLanguages", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetAvailableLanguagesForTests();
    delete process.env.TRANSIFEX_API_TOKEN;
    delete process.env.TRANSIFEX_LANGUAGE_THRESHOLD;
    delete process.env.TRANSIFEX_ORGANIZATION;
    delete process.env.TRANSIFEX_PROJECT;
  });

  afterEach(() => {
    sinon.restore();
    process.env = { ...originalEnv };
    __resetAvailableLanguagesForTests();
  });

  describe("languageCodeFromStat", () => {
    it("reads the language relationship", () => {
      assert.equal(languageCodeFromStat(stat("r1", "pt_BR", 1, 1)), "pt_BR");
    });

    it("falls back to the id suffix", () => {
      assert.equal(
        languageCodeFromStat({ id: "o:mirlo:p:mirlo:r:r1:l:uk" }),
        "uk"
      );
    });

    it("returns undefined when there's nothing to go on", () => {
      assert.equal(languageCodeFromStat({}), undefined);
    });
  });

  describe("nativeLanguageName", () => {
    it("uses the language's own name, capitalised", () => {
      assert.equal(nativeLanguageName("uk"), "Українська");
      assert.equal(nativeLanguageName("fr"), "Français");
    });

    it("maps Transifex underscore codes to BCP 47 for Intl", () => {
      assert.equal(nativeLanguageName("pt_BR"), "Português (Brasil)");
    });

    it("falls back to the code for nonsense", () => {
      assert.equal(nativeLanguageName("not a code"), "not a code");
    });
  });

  describe("getThresholdPercent", () => {
    it("defaults to 70", () => {
      assert.equal(getThresholdPercent(), 70);
    });

    it("reads a percentage", () => {
      process.env.TRANSIFEX_LANGUAGE_THRESHOLD = "85";
      assert.equal(getThresholdPercent(), 85);
    });

    it("ignores invalid values", () => {
      process.env.TRANSIFEX_LANGUAGE_THRESHOLD = "150";
      assert.equal(getThresholdPercent(), 70);
      process.env.TRANSIFEX_LANGUAGE_THRESHOLD = "abc";
      assert.equal(getThresholdPercent(), 70);
    });
  });

  describe("aggregateLanguageStats", () => {
    it("sums across resources and applies the threshold", () => {
      const result = aggregateLanguageStats(
        [
          stat("r1", "en", 100, 100),
          // 60 + 20 / 100 = 80%
          stat("r1", "uk", 60, 80),
          stat("r2", "uk", 20, 20),
          // 50 + 19 / 100 = 69%
          stat("r1", "de", 50, 80),
          stat("r2", "de", 19, 20),
          // exactly 70%
          stat("r1", "pt_BR", 70, 100),
          // no strings at all
          stat("r1", "it", 0, 0),
        ],
        70
      );
      assert.deepEqual(
        result.map((l) => l.short),
        ["en", "pt_BR", "uk"]
      );
      assert.deepEqual(result[0], { short: "en", name: "English" });
    });

    it("always includes English even with no stats", () => {
      assert.deepEqual(aggregateLanguageStats([], 70), [
        { short: "en", name: "English" },
      ]);
    });
  });

  describe("refreshAvailableLanguages", () => {
    it("doesn't call Transifex without a token", async () => {
      const fetchStub = sinon.stub(globalThis, "fetch");
      const result = await refreshAvailableLanguages();
      assert.equal(result, undefined);
      assert.equal(getAvailableLanguages(), undefined);
      assert.equal(fetchStub.callCount, 0);
    });

    it("follows pagination, sends the token, and caches the result", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      const fetchStub = sinon.stub(globalThis, "fetch");
      fetchStub.onFirstCall().resolves(
        jsonResponse({
          data: [stat("r1", "en", 10, 10), stat("r1", "fr", 9, 10)],
          links: {
            next: "https://rest.api.transifex.com/resource_language_stats?page=2",
          },
        })
      );
      fetchStub.onSecondCall().resolves(
        jsonResponse({
          data: [stat("r1", "es", 1, 10)],
          links: { next: null },
        })
      );

      await refreshAvailableLanguages();

      assert.equal(fetchStub.callCount, 2);
      const [firstUrl, firstInit] = fetchStub.firstCall.args;
      assert.ok(
        String(firstUrl).includes(
          `filter[project]=${encodeURIComponent("o:mirlo:p:mirlo")}`
        )
      );
      const headers = (firstInit as RequestInit).headers as Record<
        string,
        string
      >;
      assert.equal(headers.Authorization, "Bearer secret");
      assert.deepEqual(
        getAvailableLanguages()?.map((l) => l.short),
        ["en", "fr"]
      );
    });

    it("uses the configured organization and project", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      process.env.TRANSIFEX_ORGANIZATION = "org";
      process.env.TRANSIFEX_PROJECT = "proj";
      const fetchStub = sinon
        .stub(globalThis, "fetch")
        .resolves(jsonResponse({ data: [stat("r1", "en", 1, 1)] }));
      await refreshAvailableLanguages();
      assert.ok(
        String(fetchStub.firstCall.args[0]).includes(
          encodeURIComponent("o:org:p:proj")
        )
      );
    });

    it("keeps the previous cache when a later fetch fails", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      const fetchStub = sinon.stub(globalThis, "fetch");
      fetchStub
        .onFirstCall()
        .resolves(jsonResponse({ data: [stat("r1", "uk", 10, 10)] }));
      fetchStub.onSecondCall().resolves(jsonResponse({}, 500));
      fetchStub.onThirdCall().rejects(new Error("network down"));

      await refreshAvailableLanguages();
      await refreshAvailableLanguages();
      await refreshAvailableLanguages();

      assert.deepEqual(
        getAvailableLanguages()?.map((l) => l.short),
        ["en", "uk"]
      );
    });

    it("stays on the fallback when the first fetch fails", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      sinon.stub(globalThis, "fetch").rejects(new Error("network down"));
      const result = await refreshAvailableLanguages();
      assert.equal(result, undefined);
      assert.equal(getAvailableLanguages(), undefined);
    });

    it("refuses to send the token to a non-Transifex pagination URL", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      const fetchStub = sinon.stub(globalThis, "fetch");
      fetchStub.onFirstCall().resolves(
        jsonResponse({
          data: [stat("r1", "uk", 10, 10)],
          links: { next: "https://evil.example/steal" },
        })
      );
      await refreshAvailableLanguages();
      assert.equal(fetchStub.callCount, 1);
      assert.equal(getAvailableLanguages(), undefined);
    });

    it("shares one request between concurrent refreshes", async () => {
      process.env.TRANSIFEX_API_TOKEN = "secret";
      const fetchStub = sinon
        .stub(globalThis, "fetch")
        .resolves(jsonResponse({ data: [stat("r1", "en", 1, 1)] }));
      await Promise.all([
        refreshAvailableLanguages(),
        refreshAvailableLanguages(),
      ]);
      assert.equal(fetchStub.callCount, 1);
    });
  });
});
