import { vi } from "vitest";

type Matcher = string | ((url: string) => boolean);

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}

/**
 * Overrides the global fetch stub (client/test/vitest-setup.ts) for a test
 * that needs specific response bodies. Routes are tried in order; the first
 * whose matcher (a URL substring, or a predicate) matches wins.
 */
export function mockJsonFetch(
  routes: { matcher: Matcher; body: unknown; init?: ResponseInit }[]
) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = urlOf(input);
    const route = routes.find(({ matcher }) =>
      typeof matcher === "string" ? url.includes(matcher) : matcher(url)
    );
    return new Response(JSON.stringify(route?.body ?? null), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...route?.init,
    });
  });
}
