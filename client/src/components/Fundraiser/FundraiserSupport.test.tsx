import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { auth, stripeStatus } = vi.hoisted(() => ({
  auth: {
    user: undefined as unknown,
    refreshLoggedInUser: vi.fn(),
  },
  stripeStatus: { data: { chargesEnabled: true }, isPending: false },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key} ${opts.amount}` : key,
  }),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => stripeStatus }));
vi.mock("queries", () => ({
  queryUserStripeStatus: vi.fn(),
  useInvalidateFundraisers: () => vi.fn(),
}));
vi.mock("state/AuthContext", () => ({ useAuthContext: () => auth }));
vi.mock("components/common/TipArtist", () => ({
  default: () => <button>tip</button>,
}));
vi.mock("./FundraiserPledgeForm", () => ({
  default: ({ platformPercent, returnUrl }: any) => (
    <div
      data-testid="pledge-form"
      data-platform-percent={platformPercent}
      data-return-url={returnUrl}
    />
  ),
}));

import FundraiserSupport from "./FundraiserSupport";

const FUNDRAISER = {
  id: 7,
  urlSlug: "a-van",
  isAllOrNothing: true,
  status: "ACTIVE",
  trackGroups: [],
  artist: {
    id: 3,
    urlSlug: "tidal-hours",
    userId: 9,
    defaultPlatformFee: 10,
    user: { currency: "usd" },
  },
} as unknown as PublicFundraiser;

const renderSupport = (
  fundraiser: PublicFundraiser = FUNDRAISER,
  url = "/tidal-hours/fundraiser/a-van"
) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <FundraiserSupport fundraiser={fundraiser} />
    </MemoryRouter>
  );

describe("FundraiserSupport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = undefined;
    stripeStatus.data = { chargesEnabled: true };
  });

  test("offers a pledge form that returns to the fundraiser page", () => {
    renderSupport();
    const form = screen.getByTestId("pledge-form");
    expect(form).toHaveAttribute("data-platform-percent", "10");
    expect(form.getAttribute("data-return-url")).toMatch(
      /\/tidal-hours\/fundraiser\/a-van$/
    );
  });

  test("uses the linked release's platform cut over the artist's default", () => {
    renderSupport({
      ...FUNDRAISER,
      trackGroups: [{ id: 4, title: "Tidal Hours", platformPercent: 5 }],
    } as PublicFundraiser);
    expect(screen.getByTestId("pledge-form")).toHaveAttribute(
      "data-platform-percent",
      "5"
    );
  });

  test("shows the supporter's pledge instead of the form", () => {
    auth.user = { pledges: [{ fundraiserId: 7, amount: 4000 }] };
    renderSupport();
    expect(screen.getByText("youPledged $40.00")).toBeInTheDocument();
    expect(screen.queryByTestId("pledge-form")).not.toBeInTheDocument();
  });

  test("thanks the supporter when Stripe sends them back", () => {
    renderSupport(
      FUNDRAISER,
      "/tidal-hours/fundraiser/a-van?setup_intent=seti_1&redirect_status=succeeded"
    );
    expect(screen.getByText("thanksForPledging")).toBeInTheDocument();
    expect(auth.refreshLoggedInUser).toHaveBeenCalled();
  });

  test("offers a tip for fundraisers that aren't all or nothing", () => {
    renderSupport({ ...FUNDRAISER, isAllOrNothing: false });
    expect(screen.getByRole("button", { name: "tip" })).toBeInTheDocument();
  });

  test("says when the fundraiser has ended or the artist can't take payments", () => {
    const { unmount } = renderSupport({ ...FUNDRAISER, status: "FAILED" });
    expect(screen.getByText("ended")).toBeInTheDocument();
    unmount();

    stripeStatus.data = { chargesEnabled: false };
    renderSupport();
    expect(screen.getByText("artistNotSetUp")).toBeInTheDocument();
  });
});
