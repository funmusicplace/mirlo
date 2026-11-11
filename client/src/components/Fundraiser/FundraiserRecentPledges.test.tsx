import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key} ${opts.amount}` : key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

import FundraiserRecentPledges, {
  formatShortTimeAgo,
  FundraiserPledgeTicker,
  NEWEST_PLEDGE_DELAY,
  PLEDGE_CYCLE_INTERVAL,
} from "./FundraiserRecentPledges";

const NOW = new Date("2026-11-10T12:00:00Z");
const hoursAgo = (hours: number) =>
  new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();

const pledges = Array.from({ length: 6 }, (_, i) => ({
  id: 100 - i,
  amount: (i + 1) * 100,
  createdAt: hoursAgo(i + 1),
}));

const shownAmounts = () =>
  screen
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".font-bold")?.textContent);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("FundraiserRecentPledges", () => {
  test("adds the newest pledge to the top a few seconds in, pushing the oldest off", () => {
    render(<FundraiserRecentPledges currency="usd" pledges={pledges} />);
    expect(shownAmounts()).toEqual(["$2", "$3", "$4", "$5", "$6"]);

    act(() => {
      vi.advanceTimersByTime(NEWEST_PLEDGE_DELAY);
    });

    expect(shownAmounts()).toEqual(["$1", "$2", "$3", "$4", "$5"]);
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveClass("animate-fade-in-down");
    expect(second).not.toHaveClass("animate-fade-in-down");
    expect(first).toHaveTextContent("someonePledged$11h");
  });

  test("shows nothing before anyone has pledged", () => {
    const { container } = render(
      <FundraiserRecentPledges currency="usd" pledges={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FundraiserPledgeTicker", () => {
  test("starts at a random one of the five newest pledges and cycles through them", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    render(<FundraiserPledgeTicker currency="usd" pledges={pledges} />);
    expect(screen.getByText("someonePledgedAmount $5")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PLEDGE_CYCLE_INTERVAL);
    });
    expect(screen.getByText("someonePledgedAmount $1")).toBeInTheDocument();
    expect(
      screen.queryByText("someonePledgedAmount $5")
    ).not.toBeInTheDocument();
  });
});

describe("formatShortTimeAgo", () => {
  test("uses the largest whole unit, in its shortest form", () => {
    expect(formatShortTimeAgo(hoursAgo(0), "en")).toBe("0m");
    expect(formatShortTimeAgo(hoursAgo(0.5), "en")).toBe("30m");
    expect(formatShortTimeAgo(hoursAgo(5), "en")).toBe("5h");
    expect(formatShortTimeAgo(hoursAgo(50), "en")).toBe("2d");
    expect(formatShortTimeAgo(hoursAgo(24 * 45), "en")).toBe("6w");
    expect(formatShortTimeAgo(hoursAgo(24 * 400), "en")).toBe("1y");
    expect(formatShortTimeAgo(hoursAgo(50), "fr")).toBe("2j");
  });
});
