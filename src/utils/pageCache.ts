/**
 * A tiny in-process cache for anonymous, server-rendered HTML pages — enough to
 * absorb the burst of fediverse preview fetches that follows someone sharing a
 * link.
 *
 * This is deliberately on server rather than using Cloudflare edge:
 *
 * - A deploy rebuilds the client with fresh hashed asset filenames and drops the
 *   old ones, which would mean Cloudflare serves 404s.
 * - Only the anonymous branch is cached, and it renders without a `req`, so the
 *   `__MIRLO_AUTH__` hydration cannot be baked into a shared entry. At the edge
 *   that guarantee would live in a dashboard rule instead of in the code.
 *
 * This holds because the API runs as a single web instance.
 */

type Entry = { html: Promise<string>; expiresAt: number };

const TTL_MS = 60 * 1000;

const MAX_ENTRIES = 50;

const cache = new Map<string, Entry>();

export const getCachedPage = async (
  key: string,
  render: () => Promise<string>
): Promise<string> => {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.html;
  }

  const entry: Entry = { html: render(), expiresAt: Date.now() + TTL_MS };
  cache.delete(key);
  cache.set(key, entry);

  entry.html.catch(() => {
    if (cache.get(key) === entry) {
      cache.delete(key);
    }
  });

  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }

  return entry.html;
};

export const clearPageCache = () => {
  cache.clear();
};
