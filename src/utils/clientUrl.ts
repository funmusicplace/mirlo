// Helpers for building redirect URLs that point at a client application
// (Mirlo's own frontend or a registered API consumer's site). Shared by the
// post-payment checkout return handler and the hosted-checkout redirect.

const DEFAULT_CLIENT_BASE_URL = process.env.API_DOMAIN ?? "https://mirlo.space";

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export const normaliseBaseUrl = (candidate?: string | null) => {
  const fallback = ensureTrailingSlash(DEFAULT_CLIENT_BASE_URL);
  if (!candidate) {
    return fallback;
  }

  try {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return fallback;
    }

    const parsed = new URL(trimmed);
    return ensureTrailingSlash(parsed.toString());
  } catch (error) {
    console.warn(
      "Invalid client application URL provided, falling back to default domain",
      error
    );
    return fallback;
  }
};

export const buildCheckoutRedirectUrl = (
  baseUrl: string | null | undefined,
  path: string,
  params: URLSearchParams
) => {
  const target = new URL(path.replace(/^\/+/, ""), normaliseBaseUrl(baseUrl));
  params.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return target.toString();
};

/** The origin of a URL, or null if it can't be parsed. */
export const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};
