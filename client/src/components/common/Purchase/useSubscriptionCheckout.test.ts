import { act, renderHook } from "@testing-library/react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useSubscriptionCheckout } from "./useSubscriptionCheckout";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

const refreshLoggedInUser = vi.fn();
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ refreshLoggedInUser }),
}));

vi.mock("services/api", () => ({
  default: { post: vi.fn() },
}));

vi.mock("services/useErrorHandler", () => ({
  default: () => vi.fn(),
}));

const artist = { id: 10, urlSlug: "test-artist" };

describe("useSubscriptionCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("derives returnUrl from the artist's checkout-complete path", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionCheckout({ artist, refresh })
    );

    expect(result.current.returnUrl).toBe(
      `${window.location.origin}/test-artist/checkout-complete?purchaseType=subscription`
    );
  });

  test("falls back to window.location.origin when there's no artist yet", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionCheckout({ artist: null, refresh })
    );

    expect(result.current.returnUrl).toBe(window.location.origin);
  });

  test("sets checkout once startPurchase resolves a clientSecret", async () => {
    vi.mocked(api.post).mockResolvedValue({
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
    });
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionCheckout({ artist, refresh })
    );

    await act(async () => {
      await result.current.startPurchase({
        artistId: artist.id,
        items: [{ type: "subscription", tierId: 1 }],
      });
    });

    expect(result.current.checkout).toEqual({
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
      requiresShipping: undefined,
      allowedCountries: undefined,
    });
  });

  test("handlePurchaseComplete refreshes user + artist data, resets checkout, and navigates to checkout-complete", async () => {
    vi.mocked(api.post).mockResolvedValue({
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
    });
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionCheckout({ artist, refresh })
    );

    await act(async () => {
      await result.current.startPurchase({
        artistId: artist.id,
        items: [{ type: "subscription", tierId: 1 }],
      });
    });
    expect(result.current.checkout).not.toBeNull();

    act(() => {
      result.current.handlePurchaseComplete();
    });

    expect(refreshLoggedInUser).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
    expect(result.current.checkout).toBeNull();
    expect(navigate).toHaveBeenCalledWith(
      "/test-artist/checkout-complete?purchaseType=subscription"
    );
  });

  test("handlePurchaseComplete is a no-op when there's no artist yet", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionCheckout({ artist: null, refresh })
    );

    act(() => {
      result.current.handlePurchaseComplete();
    });

    expect(refreshLoggedInUser).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
