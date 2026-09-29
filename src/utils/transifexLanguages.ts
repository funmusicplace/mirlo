import { sumBy, toPairs } from "lodash";

import logger from "../logger";

/**
 * Which UI languages the client offers, derived from Transifex completion
 * stats (issue #2004).
 *
 * Transifex is only ever called from here: once at server start (fire and
 * forget) and then on a long interval. Page renders read the in-memory cache
 * synchronously via `getAvailableLanguages()` and never wait on Transifex.
 * When nothing has been fetched (no token, request failed, still in flight),
 * `getAvailableLanguages()` returns `undefined` and nothing is injected, so the
 * client falls back to its hardcoded list in client/src/i18n.ts.
 */

export type AvailableLanguage = {
  // Transifex language code as used by Transifex Native / i18next on the
  // client, e.g. "uk" or "pt_BR".
  short: string;
  // The language's own name for itself, e.g. "Українська".
  name: string;
};

const TRANSIFEX_API_BASE = "https://rest.api.transifex.com";
const DEFAULT_THRESHOLD_PERCENT = 70;
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 50;

type LanguageStatsItem = {
  id?: string;
  attributes?: {
    translated_strings?: number;
    total_strings?: number;
  };
  relationships?: {
    language?: { data?: { id?: string } };
  };
};

type LanguageStatsPage = {
  data?: LanguageStatsItem[];
  links?: { next?: string | null };
};

let cachedLanguages: AvailableLanguage[] | undefined;
let inFlight: Promise<AvailableLanguage[] | undefined> | undefined;
let refreshTimer: NodeJS.Timeout | undefined;

/**
 * TRANSIFEX_LANGUAGE_THRESHOLD is a percentage, 0-100 (default 70).
 */
export const getThresholdPercent = () => {
  const raw = process.env.TRANSIFEX_LANGUAGE_THRESHOLD;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_THRESHOLD_PERCENT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    logger.warn(
      `Ignoring invalid TRANSIFEX_LANGUAGE_THRESHOLD "${raw}", using ${DEFAULT_THRESHOLD_PERCENT}`
    );
    return DEFAULT_THRESHOLD_PERCENT;
  }
  return parsed;
};

/**
 * "l:pt_BR" -> "pt_BR". Falls back to the ":l:<code>" suffix of the stats id
 * (`o:mirlo:p:mirlo:r:<resource>:l:<code>`) if the relationship is missing.
 */
export const languageCodeFromStat = (item: LanguageStatsItem) => {
  const relId = item.relationships?.language?.data?.id;
  if (typeof relId === "string" && relId.startsWith("l:")) {
    return relId.slice(2);
  }
  const match =
    typeof item.id === "string" ? /:l:([^:]+)$/.exec(item.id) : null;
  return match?.[1];
};

/**
 * The language's name in that language, capitalised, e.g. "pt_BR" ->
 * "Português (Brasil)". Falls back to the code if Intl doesn't know it.
 */
export const nativeLanguageName = (code: string) => {
  // Intl wants BCP 47 ("pt-BR"), Transifex uses underscores ("pt_BR").
  const bcp47 = code.replace(/_/g, "-");
  try {
    const name = new Intl.DisplayNames([bcp47], { type: "language" }).of(bcp47);
    if (name && name !== bcp47) {
      return name.charAt(0).toLocaleUpperCase(bcp47) + name.slice(1);
    }
  } catch {
    // Invalid or unknown locale code
  }
  return code;
};

/**
 * Sum translated / total strings across resources per language and keep the
 * ones at or above the threshold. English (the source language) is always
 * included, first.
 */
export const aggregateLanguageStats = (
  items: LanguageStatsItem[],
  thresholdPercent: number
): AvailableLanguage[] => {
  const byLanguage: Record<string, { translated: number; total: number }[]> =
    {};
  items.forEach((item) => {
    const code = languageCodeFromStat(item);
    if (!code) {
      return;
    }
    const translated = Number(item.attributes?.translated_strings ?? 0);
    const total = Number(item.attributes?.total_strings ?? 0);
    byLanguage[code] = byLanguage[code] ?? [];
    byLanguage[code].push({
      translated: Number.isFinite(translated) ? translated : 0,
      total: Number.isFinite(total) ? total : 0,
    });
  });

  const passing = toPairs(byLanguage)
    .filter(([code]) => code !== "en")
    .filter(([, stats]) => {
      const total = sumBy(stats, "total");
      if (total <= 0) {
        return false;
      }
      return (sumBy(stats, "translated") / total) * 100 >= thresholdPercent;
    })
    .map(([code]) => ({ short: code, name: nativeLanguageName(code) }))
    .sort((a, b) => a.short.localeCompare(b.short));

  return [{ short: "en", name: "English" }, ...passing];
};

const fetchAllLanguageStats = async (token: string) => {
  const organization = process.env.TRANSIFEX_ORGANIZATION || "mirlo";
  const project = process.env.TRANSIFEX_PROJECT || "mirlo";
  const filter = encodeURIComponent(`o:${organization}:p:${project}`);
  let url: string | null | undefined =
    `${TRANSIFEX_API_BASE}/resource_language_stats?filter[project]=${filter}`;

  const items: LanguageStatsItem[] = [];
  for (let page = 0; url && page < MAX_PAGES; page++) {
    // Only ever send the token to Transifex itself.
    if (!url.startsWith(`${TRANSIFEX_API_BASE}/`)) {
      throw new Error(`Unexpected Transifex pagination URL: ${url}`);
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `Transifex resource_language_stats returned ${response.status}`
      );
    }
    const body = (await response.json()) as LanguageStatsPage;
    items.push(...(Array.isArray(body.data) ? body.data : []));
    url = body.links?.next;
  }
  return items;
};

/**
 * Fetch from Transifex and update the cache. Never throws; on failure the
 * previous cache (or the client-side fallback) stays in place. Concurrent
 * calls share one request.
 */
export const refreshAvailableLanguages = async (): Promise<
  AvailableLanguage[] | undefined
> => {
  const token = process.env.TRANSIFEX_API_TOKEN;
  if (!token) {
    logger.info(
      "TRANSIFEX_API_TOKEN not set; using the client's built-in language list"
    );
    return cachedLanguages;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    try {
      const items = await fetchAllLanguageStats(token);
      if (items.length === 0) {
        throw new Error("Transifex returned no language stats");
      }
      cachedLanguages = aggregateLanguageStats(items, getThresholdPercent());
      logger.info(
        `Loaded ${cachedLanguages.length} available languages from Transifex: ${cachedLanguages
          .map((l) => l.short)
          .join(", ")}`
      );
    } catch (e) {
      logger.error(
        `Failed to fetch available languages from Transifex: ${e instanceof Error ? e.message : e}`
      );
    } finally {
      inFlight = undefined;
    }
    return cachedLanguages;
  })();
  return inFlight;
};

/**
 * Synchronous, cache-only. `undefined` means "use the client's fallback".
 */
export const getAvailableLanguages = () => cachedLanguages;

/**
 * Kick off the first fetch and schedule a rare refresh. Doesn't block, and the
 * timer doesn't keep the process alive.
 */
export const startAvailableLanguagesRefresh = () => {
  void refreshAvailableLanguages();
  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      void refreshAvailableLanguages();
    }, REFRESH_INTERVAL_MS);
    refreshTimer.unref();
  }
};

/** Test-only: reset module state. */
export const __resetAvailableLanguagesForTests = () => {
  cachedLanguages = undefined;
  inFlight = undefined;
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
};
