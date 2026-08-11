import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const artistState: { artist: any } = { artist: null };
vi.mock("utils/useArtistQuery", () => ({
  default: () => ({ data: artistState.artist }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { chargesEnabled: true },
      isPending: false,
    }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: () => ({ search: "" }),
    useOutletContext: () => ({ openTipModal: vi.fn() }),
  };
});

const authState: { user: any } = { user: null };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: authState.user }),
}));

vi.mock("services/useErrorHandler", () => ({
  default: () => vi.fn(),
}));

vi.mock("components/Artist/ArtistManageSubscription", () => ({
  default: ({ userSubscriptionTier }: any) => (
    <div data-testid="manage-subscription">
      supportingArtistAtTier:{userSubscriptionTier.name}
    </div>
  ),
}));

vi.mock("components/Artist/ArtistSupportBox", () => ({
  default: ({ subscriptionTier }: any) => (
    <div data-testid="support-box">{subscriptionTier.name}</div>
  ),
}));

vi.mock("components/Artist/ScrollButton", () => ({
  default: () => null,
}));

vi.mock("components/common/TipArtist", () => ({
  default: () => null,
}));

import Index from "./Index";

const supporterTier = {
  id: 1,
  artistId: 10,
  name: "Supporter",
  isDefaultTier: false,
};

const otherTier = {
  id: 2,
  artistId: 10,
  name: "Superfan",
  isDefaultTier: false,
};

function makeArtist(subscriptionTiers: any[]) {
  return {
    id: 10,
    userId: 99,
    name: "Test Artist",
    subscriptionTiers,
    properties: {},
  };
}

describe("Support Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    artistState.artist = null;
  });

  test("shows only the tier boxes when the user has no active subscription", () => {
    artistState.artist = makeArtist([supporterTier, otherTier]);
    authState.user = { id: 20, artistUserSubscriptions: [] };

    render(<Index />);

    expect(screen.queryByTestId("manage-subscription")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("support-box")).toHaveLength(2);
  });

  test("shows the active-subscription message alongside all tier boxes, not instead of them", () => {
    artistState.artist = makeArtist([supporterTier, otherTier]);
    authState.user = {
      id: 20,
      artistUserSubscriptions: [
        {
          artistSubscriptionTierId: supporterTier.id,
          artistSubscriptionTier: supporterTier,
        },
      ],
    };

    render(<Index />);

    expect(screen.getByTestId("manage-subscription")).toHaveTextContent(
      "Supporter"
    );
    const boxes = screen.getAllByTestId("support-box");
    expect(boxes).toHaveLength(2);
    expect(boxes.map((b) => b.textContent)).toEqual(["Supporter", "Superfan"]);
  });
});
