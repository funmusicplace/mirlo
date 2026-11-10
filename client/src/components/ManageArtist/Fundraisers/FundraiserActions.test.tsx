import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { chargePledges, deleteFundraiser } = vi.hoisted(() => ({
  chargePledges: vi.fn(),
  deleteFundraiser: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("queries", () => ({
  useChargeFundraiserPledgesMutation: () => ({
    mutateAsync: chargePledges,
    isPending: false,
  }),
  useDeleteFundraiserMutation: () => ({
    mutateAsync: deleteFundraiser,
    isPending: false,
  }),
}));
vi.mock("services/useErrorHandler", () => ({ default: () => vi.fn() }));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
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
    deleteFundraiser.mockResolvedValue({});
  });

  test("hides charging until an all-or-nothing goal is met", () => {
    render(
      <FundraiserActions
        fundraiser={allOrNothing}
        amountRaised={9999}
        pledgeCount={3}
      />
    );
    expect(
      screen.queryByRole("button", { name: "chargePledges" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "viewPledges" })).toHaveAttribute(
      "href",
      "/manage/fundraiser/7/pledges"
    );
  });

  test("charges pledges once the goal is met", async () => {
    const onChanged = vi.fn();
    render(
      <FundraiserActions
        fundraiser={allOrNothing}
        amountRaised={10000}
        pledgeCount={3}
        onChanged={onChanged}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "chargePledges" })
    );

    expect(chargePledges).toHaveBeenCalledWith(7);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  test("lets a fundraiser that isn't all-or-nothing be marked done, without a pledges link", () => {
    render(
      <FundraiserActions
        fundraiser={{ ...allOrNothing, isAllOrNothing: false }}
        amountRaised={0}
        pledgeCount={0}
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
        pledgeCount={3}
      />
    );
    expect(
      screen.queryByRole("button", { name: "chargePledges" })
    ).not.toBeInTheDocument();
  });

  test("asks before cancelling a fundraiser that has pledges", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onRemoved = vi.fn();
    render(
      <FundraiserActions
        fundraiser={allOrNothing}
        amountRaised={500}
        pledgeCount={2}
        onRemoved={onRemoved}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "cancelFundraiser" })
    );

    expect(confirm).toHaveBeenCalled();
    expect(deleteFundraiser).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  test("removes a fundraiser without pledges straight away", async () => {
    const onRemoved = vi.fn();
    render(
      <FundraiserActions
        fundraiser={allOrNothing}
        amountRaised={0}
        pledgeCount={0}
        onRemoved={onRemoved}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "removeFundraiser" })
    );

    expect(deleteFundraiser).toHaveBeenCalledWith(7);
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  });
});
