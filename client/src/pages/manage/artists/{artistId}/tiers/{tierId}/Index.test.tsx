/**
 * Exercises the real page (query gating included) rather than a stubbed-down
 * SubscriptionForm, to check whether #1919 ("header image doesn't load on
 * first load") is actually reachable through the page as it exists today, or
 * whether it was already masked by the `isLoading` gate.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 1, currency: "usd" } }),
}));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("services/useErrorHandler", () => ({ default: () => vi.fn() }));

// Peripheral to the image-loading question; stub to keep the test focused.
vi.mock("components/ManageArtist/BackToArtistLink", () => ({
  default: () => null,
}));
vi.mock(
  "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/PaymentSlider",
  () => ({ default: () => null })
);
vi.mock("components/ManageArtist/ManageSubscriptionTierReleases", () => ({
  default: () => null,
}));

import Index from "./Index";

// ---- fixtures ---------------------------------------------------------------

const artist = { id: 1, name: "Test Artist", urlSlug: "test-artist" };

const tierWithImage = {
  id: 5,
  artistId: 1,
  name: "Gold Tier",
  description: "",
  interval: "MONTH",
  isDefaultTier: false,
  platformPercent: 5,
  minAmount: 500,
  images: [
    {
      imageId: "image-1",
      image: {
        id: "image-1",
        url: ["tier-header-x625.webp"],
        sizes: { 625: "https://cdn.example.com/tier-header-x625.webp" },
        updatedAt: new Date().toISOString(),
      },
    },
  ],
  releases: [],
};

// ---- helpers ----------------------------------------------------------------

/** A promise the test controls the resolution timing of, like a real fetch. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/manage/artists/1/tiers/5"]}>
        <Routes>
          <Route
            path="/manage/artists/:artistId/tiers/:tierId"
            element={<Index />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// ---- tests ------------------------------------------------------------------

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("subscription tier edit page", () => {
  it("shows the tier's header image once the tier query resolves (#1919)", async () => {
    const artistFetch = deferred<Response>();
    const tierFetch = deferred<Response>();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("subscriptionTiers")) return tierFetch.promise;
      if (url.includes("/manage/artists/")) return artistFetch.promise;
      return Promise.resolve(jsonResponse({ result: null }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    // Nothing resolved yet: the page shows its loading state, not the form.
    expect(
      screen.queryByRole("textbox", { name: /^name$/i })
    ).not.toBeInTheDocument();

    // Artist resolves first (as it often will, being the lighter fetch).
    artistFetch.resolve(jsonResponse({ result: artist }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Tier resolves after — mirrors the page's real async gate, where the two
    // independent queries settle at different times.
    tierFetch.resolve(jsonResponse({ result: tierWithImage }));

    await screen.findByRole("textbox", { name: /^name$/i });

    const img = await screen.findByRole("img");
    expect((img as HTMLImageElement).src).toContain("tier-header-x625.webp");
  });

  it("also shows the header image when the tier resolves before the artist", async () => {
    const artistFetch = deferred<Response>();
    const tierFetch = deferred<Response>();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("subscriptionTiers")) return tierFetch.promise;
      if (url.includes("/manage/artists/")) return artistFetch.promise;
      return Promise.resolve(jsonResponse({ result: null }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    // This time the heavier tier fetch settles first.
    tierFetch.resolve(jsonResponse({ result: tierWithImage }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(
      screen.queryByRole("textbox", { name: /^name$/i })
    ).not.toBeInTheDocument();

    artistFetch.resolve(jsonResponse({ result: artist }));

    await screen.findByRole("textbox", { name: /^name$/i });

    const img = await screen.findByRole("img");
    expect((img as HTMLImageElement).src).toContain("tier-header-x625.webp");
  });
});
