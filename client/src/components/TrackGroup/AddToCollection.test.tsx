import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const authState: { user: any } = { user: null };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: authState.user }),
}));

const mockSnackbar = vi.fn();
vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => mockSnackbar,
}));

const startPurchase = vi.fn();
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({
    checkout: null,
    isLoading: false,
    startPurchase,
    reset: vi.fn(),
  }),
}));

import AddToCollection from "./AddToCollection";

function makeTrackGroup(overrides: Partial<TrackGroup> = {}) {
  return {
    id: 10,
    artistId: 1,
    artist: { id: 1 },
    ...overrides,
  } as TrackGroup;
}

function renderComponent(props: {
  trackGroup: TrackGroup;
  track?: Track;
  fixed?: boolean;
}) {
  return render(<AddToCollection {...props} />, { wrapper: MemoryRouter });
}

describe("AddToCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
  });

  test("disables the button when the user is logged out", () => {
    renderComponent({ trackGroup: makeTrackGroup() });

    expect(
      screen.getByRole("button", { name: "addToCollection" })
    ).toBeDisabled();
  });

  test("requests a free trackGroup grant when clicked", async () => {
    authState.user = { id: 5 };
    renderComponent({ trackGroup: makeTrackGroup() });

    await userEvent.click(
      screen.getByRole("button", { name: "addToCollection" })
    );

    expect(startPurchase).toHaveBeenCalledWith({
      artistId: 1,
      items: [{ type: "trackGroup", id: 10, price: "0" }],
    });
  });

  test("requests a free track grant (not the whole trackGroup) when a track is given", async () => {
    authState.user = { id: 5 };
    const track = { id: 99 } as Track;
    renderComponent({ trackGroup: makeTrackGroup(), track });

    await userEvent.click(
      screen.getByRole("button", { name: "addToCollection" })
    );

    expect(startPurchase).toHaveBeenCalledWith({
      artistId: 1,
      items: [{ type: "track", id: 99, price: "0" }],
    });
  });

  test("shows a success snackbar after the purchase resolves", async () => {
    authState.user = { id: 5 };
    startPurchase.mockResolvedValue(undefined);
    renderComponent({ trackGroup: makeTrackGroup() });

    await userEvent.click(
      screen.getByRole("button", { name: "addToCollection" })
    );

    expect(mockSnackbar).toHaveBeenCalledWith("success", { type: "success" });
  });

  test("shows a warning snackbar when the purchase throws", async () => {
    authState.user = { id: 5 };
    startPurchase.mockRejectedValue(new Error("boom"));
    renderComponent({ trackGroup: makeTrackGroup() });

    await userEvent.click(
      screen.getByRole("button", { name: "addToCollection" })
    );

    expect(mockSnackbar).toHaveBeenCalledWith("error", { type: "warning" });
  });
});
