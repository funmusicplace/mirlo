import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { chargePledges, ask } = vi.hoisted(() => ({
  chargePledges: vi.fn(),
  ask: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("queries", () => ({
  useChargeFundraiserPledgesMutation: () => ({
    mutateAsync: chargePledges,
    isPending: false,
  }),
}));
vi.mock("services/useErrorHandler", () => ({ default: () => vi.fn() }));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("utils/useConfirm", () => ({ useConfirm: () => ({ ask }) }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, onClick, type }: any) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
  ArtistButtonLink: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

import FundraiserActions from "./FundraiserActions";

const allOrNothing = {
  id: 7,
  isAllOrNothing: true,
  goalAmount: 10000,
  status: "ACTIVE" as const,
};

describe("FundraiserActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chargePledges.mockResolvedValue({});
    ask.mockResolvedValue(true);
  });

  test("hides charging until an all-or-nothing goal is met", () => {
    render(<FundraiserActions fundraiser={allOrNothing} amountRaised={9999} />);
    expect(
      screen.queryByRole("button", { name: "chargePledges" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "viewPledges" })).toHaveAttribute(
      "href",
      "/manage/fundraiser/7/pledges"
    );
  });

  test("charges pledges once the goal is met, after confirming", async () => {
    render(
      <FundraiserActions fundraiser={allOrNothing} amountRaised={10000} />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "chargePledges" })
    );

    expect(ask).toHaveBeenCalledWith("confirmChargePledges");
    await waitFor(() => expect(chargePledges).toHaveBeenCalledWith(7));
  });

  test("doesn't charge when the artist backs out of the confirmation", async () => {
    ask.mockResolvedValue(false);
    render(
      <FundraiserActions fundraiser={allOrNothing} amountRaised={10000} />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "chargePledges" })
    );

    await waitFor(() => expect(ask).toHaveBeenCalled());
    expect(chargePledges).not.toHaveBeenCalled();
  });

  test("lets a fundraiser that isn't all-or-nothing be marked done, without a pledges link", () => {
    render(
      <FundraiserActions
        fundraiser={{ ...allOrNothing, isAllOrNothing: false }}
        amountRaised={0}
      />
    );
    expect(
      screen.getByRole("button", { name: "markFundraiserDone" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "viewPledges" })
    ).not.toBeInTheDocument();
  });

  test("offers nothing to charge once the fundraiser is complete", () => {
    render(
      <FundraiserActions
        fundraiser={{ ...allOrNothing, status: "SUCCESSFUL" }}
        amountRaised={20000}
      />
    );
    expect(
      screen.queryByRole("button", { name: "chargePledges" })
    ).not.toBeInTheDocument();
  });
});
