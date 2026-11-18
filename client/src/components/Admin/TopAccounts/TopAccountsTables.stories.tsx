import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import type { TopRanking, TopRankingPeriod } from "queries/admin";

import {
  makeTopRankings,
  TOP_SELLER_NAME,
  TopRankings,
} from "../../../../test/mocks";

import TopAccountsTables from "./TopAccountsTables";

const topRankingsHandler = (
  respond: (period: TopRankingPeriod) => TopRankings
) =>
  http.get("*/v1/admin/stats/:ranking", ({ request, params }) => {
    const period =
      new URL(request.url).searchParams.get("period") === "year"
        ? "year"
        : "month";
    return HttpResponse.json({
      result: respond(period)[params.ranking as TopRanking],
    });
  });

const meta = {
  title: "Features/Admin/TopAccountsTables",
  component: TopAccountsTables,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        topRankings: topRankingsHandler((period) => makeTopRankings(period)),
      },
    },
  },
} satisfies Meta<typeof TopAccountsTables>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(TOP_SELLER_NAME);
    // Nameless purchasers fall back to their email.
    await expect(
      await canvas.findByText("listener3@example.com")
    ).toBeInTheDocument();
    await expect(await canvas.findByText("Fan 1")).toBeInTheDocument();
  },
};

export const SwitchToYear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(TOP_SELLER_NAME);
    await userEvent.selectOptions(canvas.getByRole("combobox"), "year");
    // The top seller's month total is $510.00; a year is 12x that.
    await canvas.findByText("$6,120.00");
  },
};

export const ExpandTable: Story = {
  parameters: {
    msw: {
      handlers: {
        topRankings: topRankingsHandler((period) =>
          makeTopRankings(period, 50)
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Uploader 10");
    await expect(canvas.queryByText("Uploader 11")).not.toBeInTheDocument();
    await userEvent.click(canvas.getAllByText("Show all 50")[4]);
    await canvas.findByText("Uploader 50");
  },
};

export const CsvMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(TOP_SELLER_NAME);
    await userEvent.click(
      canvas.getByRole("button", { name: "Top 50 Sellers options" })
    );
    await expect(
      within(document.body).getByText("Download CSV")
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: {
        topRankings: topRankingsHandler((period) => makeTopRankings(period, 0)),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getAllByText("No sales in this period.")).toHaveLength(2)
    );
    await expect(
      await canvas.findByText("No plays in this period.")
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText("No free downloads in this period.")
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText("No uploads in this period.")
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText("No album downloads in this period.")
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        topRankings: http.get("*/v1/admin/stats/:ranking", () =>
          delay("infinite")
        ),
      },
    },
  },
};

export const Failed: Story = {
  parameters: {
    msw: {
      handlers: {
        topRankings: http.get("*/v1/admin/stats/:ranking", () =>
          HttpResponse.json({ error: "Something went wrong" }, { status: 500 })
        ),
      },
    },
  },
};
