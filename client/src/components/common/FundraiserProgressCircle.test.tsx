import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { percent?: number }) => `${key} ${opts?.percent}`,
    i18n: { language: "en" },
  }),
}));

import FundraiserProgressCircle from "./FundraiserProgressCircle";

describe("FundraiserProgressCircle", () => {
  test("shows the share of the goal raised, rounded down", () => {
    render(<FundraiserProgressCircle amountRaised={8310} goalAmount={25000} />);
    const progress = screen.getByRole("progressbar", {
      name: "percentOfGoal 33",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "33");
    expect(progress).toHaveTextContent("33%");
  });

  test("shows more than 100% when the goal is passed, with a full circle", () => {
    render(<FundraiserProgressCircle amountRaised={150} goalAmount={100} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveTextContent("150%");
    expect(progress).toHaveAttribute("aria-valuenow", "100");
  });

  test("draws no arc when nothing is raised, or there's no goal", () => {
    const { container } = render(
      <FundraiserProgressCircle amountRaised={500} goalAmount={0} />
    );
    expect(screen.getByRole("progressbar")).toHaveTextContent("0%");
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });
});
