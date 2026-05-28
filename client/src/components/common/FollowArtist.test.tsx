import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("services/api", () => ({
  default: { post: vi.fn() },
}));

vi.mock("components/common/Modal", () => ({
  default: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
    onClose?: () => void;
    size?: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

vi.mock("components/common/SupportArtistTiersForm", () => ({
  default: () => <div data-testid="support-tiers-form" />,
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => null,
}));

import FollowArtist from "./FollowArtist";

// ---- fixtures ---------------------------------------------------------------

const DEFAULT_TIER = { id: 1, isDefaultTier: true, name: "Free Follower" };
const PAID_TIER = { id: 2, isDefaultTier: false, name: "Supporter" };

function makeArtist(
  overrides: Partial<{
    subscriptionTiers: { id: number; isDefaultTier: boolean; name: string }[];
  }> = {}
) {
  return {
    id: 1,
    name: "Test Artist",
    urlSlug: "test-artist",
    subscriptionTiers: [] as {
      id: number;
      isDefaultTier: boolean;
      name: string;
    }[],
    ...overrides,
  };
}

function makeUser(
  artistId: number,
  tiers: { id: number; isDefaultTier: boolean }[]
) {
  return {
    id: 42,
    email: "user@test.com",
    artistUserSubscriptions: tiers.map((tier) => ({
      artistSubscriptionTier: { artistId, isDefaultTier: tier.isDefaultTier },
    })),
  };
}

// ---- helpers ----------------------------------------------------------------

function mockArtistFetch(artist: ReturnType<typeof makeArtist> | null) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (url.includes("/v1/artists/")) {
      return new Response(JSON.stringify({ result: artist }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ result: null }), { status: 200 });
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderFollowArtist(artistId = 1) {
  return render(<FollowArtist artistId={artistId} />, {
    wrapper: createWrapper(),
  });
}

// ---- tests ------------------------------------------------------------------

describe("FollowArtist", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({});
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      refreshLoggedInUser: vi.fn(),
    } as any);
    mockArtistFetch(makeArtist());
  });

  describe("when artist data is unavailable", () => {
    test("renders nothing while artist query returns null", async () => {
      mockArtistFetch(null);
      const { container } = renderFollowArtist();
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });

  describe("when user has a paid subscription", () => {
    test("shows isSubscribed text instead of follow button", async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, [PAID_TIER]),
        refreshLoggedInUser: vi.fn(),
      } as any);

      renderFollowArtist();

      await waitFor(() => {
        expect(screen.getByText("isSubscribed")).toBeInTheDocument();
      });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("when user is not logged in", () => {
    test("shows a Follow button", async () => {
      renderFollowArtist();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /follow/i })
        ).toBeInTheDocument();
      });
    });

    test("opens modal with newsletter prompt and email form when artist has no paid tiers", async () => {
      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /follow/i }));
      await userEvent.click(screen.getByRole("button", { name: /follow/i }));

      expect(
        screen.getByText("enterEmailToSubscribeToNewsletter")
      ).toBeInTheDocument();
      expect(screen.getByTestId("support-tiers-form")).toBeInTheDocument();
    });

    test("opens modal with chooseSupportLevel and tiers form when artist has paid tiers", async () => {
      mockArtistFetch(
        makeArtist({ subscriptionTiers: [DEFAULT_TIER, PAID_TIER] })
      );

      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /follow/i }));
      await userEvent.click(screen.getByRole("button", { name: /follow/i }));

      expect(screen.getByText("chooseSupportLevel")).toBeInTheDocument();
      expect(screen.getByTestId("support-tiers-form")).toBeInTheDocument();
    });
  });

  describe("when user is logged in and not following", () => {
    test("shows a Follow button", async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, []),
        refreshLoggedInUser: vi.fn(),
      } as any);

      renderFollowArtist();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /follow/i })
        ).toBeInTheDocument();
      });
    });

    test("calls follow API and opens success modal on click", async () => {
      const refreshLoggedInUser = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, []),
        refreshLoggedInUser,
      } as any);

      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /follow/i }));
      await userEvent.click(screen.getByRole("button", { name: /follow/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "artists/1/follow",
          expect.anything()
        );
      });
      expect(refreshLoggedInUser).toHaveBeenCalled();
      expect(screen.getByText("youveSubscribed")).toBeInTheDocument();
    });

    test("shows paid tiers form in success modal when artist has paid tiers", async () => {
      mockArtistFetch(
        makeArtist({ subscriptionTiers: [DEFAULT_TIER, PAID_TIER] })
      );
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, []),
        refreshLoggedInUser: vi.fn().mockResolvedValue(undefined),
      } as any);

      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /follow/i }));
      await userEvent.click(screen.getByRole("button", { name: /follow/i }));

      await waitFor(() => {
        expect(screen.getByTestId("support-tiers-form")).toBeInTheDocument();
      });
    });
  });

  describe("when user is logged in and following", () => {
    test("shows an Unfollow button", async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, [DEFAULT_TIER]),
        refreshLoggedInUser: vi.fn(),
      } as any);

      renderFollowArtist();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /unfollow/i })
        ).toBeInTheDocument();
      });
    });

    test("calls unfollow API on click and does not open modal", async () => {
      const refreshLoggedInUser = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, [DEFAULT_TIER]),
        refreshLoggedInUser,
      } as any);

      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /unfollow/i }));
      await userEvent.click(screen.getByRole("button", { name: /unfollow/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "artists/1/unfollow",
          expect.anything()
        );
      });
      expect(refreshLoggedInUser).toHaveBeenCalled();
      expect(screen.queryByText("youveSubscribed")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    test("defers refreshLoggedInUser until after the API call resolves", async () => {
      let resolvePost!: () => void;
      vi.mocked(api.post).mockReturnValue(
        new Promise<void>((resolve) => {
          resolvePost = resolve;
        }) as any
      );
      const refreshLoggedInUser = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthContext).mockReturnValue({
        user: makeUser(1, []),
        refreshLoggedInUser,
      } as any);

      renderFollowArtist();

      await waitFor(() => screen.getByRole("button", { name: /follow/i }));

      // Use fireEvent so we don't await React settling — lets us inspect mid-flight
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.click(screen.getByRole("button", { name: /follow/i }));

      // api.post called immediately on click
      expect(api.post).toHaveBeenCalledWith(
        "artists/1/follow",
        expect.anything()
      );
      // refresh not called yet — the promise is still pending
      expect(refreshLoggedInUser).not.toHaveBeenCalled();

      resolvePost();

      await waitFor(() => {
        expect(refreshLoggedInUser).toHaveBeenCalled();
      });
    });
  });
});
