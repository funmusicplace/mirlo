import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${Object.values(opts).join(" ")}` : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButtonLink: ({ to, "aria-label": ariaLabel }: any) => (
    <a href={to} aria-label={ariaLabel} />
  ),
}));

import ManageFundraisersList from "./ManageFundraisersList";

const makeFundraiser = (
  overrides: Partial<FundraiserSummary> = {}
): FundraiserSummary =>
  ({
    id: 3,
    name: "Press the vinyl",
    goalAmount: 50000,
    minPledge: 1000,
    amountRaised: 12550,
    pledgeCount: 4,
    isAllOrNothing: true,
    status: "ACTIVE",
    endDate: "",
    trackGroups: [],
    ...overrides,
  }) as FundraiserSummary;

describe("ManageFundraisersList", () => {
  test("renders nothing when the artist has no fundraisers", () => {
    const { container } = render(
      <ManageFundraisersList artistId={10} fundraisers={[]} currency="usd" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("shows each fundraiser's progress, name, amount raised out of its goal and an edit link", () => {
    render(
      <ManageFundraisersList
        artistId={10}
        fundraisers={[makeFundraiser()]}
        currency="usd"
      />
    );

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Press the vinyl")).toBeInTheDocument();
    expect(row).toHaveTextContent("raisedOutOfGoal $125.50 $500.00");
    expect(within(row).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "25"
    );
    expect(
      within(row).getByRole("link", {
        name: "editFundraiserName Press the vinyl",
      })
    ).toHaveAttribute("href", "/manage/artists/10/fundraisers/3");
  });

  test("marks fundraisers that reached their goal", () => {
    render(
      <ManageFundraisersList
        artistId={10}
        fundraisers={[
          makeFundraiser({ id: 1, name: "Funded one", status: "SUCCESSFUL" }),
          makeFundraiser({ id: 2, name: "Running one" }),
        ]}
        currency="usd"
      />
    );

    const [funded, running] = screen.getAllByRole("listitem");
    expect(within(funded).getByText("funded")).toBeInTheDocument();
    expect(within(running).queryByText("funded")).not.toBeInTheDocument();
  });
});
