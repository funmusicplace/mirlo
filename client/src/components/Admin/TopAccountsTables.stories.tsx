import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import type { AdminTopAccounts, TopAccountsPeriod } from "queries/admin";

import { makeTopAccounts, TOP_SELLER_NAME } from "../../../test/mocks";

import TopAccountsTables from "./TopAccountsTables";

const topAccountsHandler = (
  respond: (period: TopAccountsPeriod) => AdminTopAccounts
) =>
  http.get("*/v1/admin/topAccounts", ({ request }) => {
    const period =
      new URL(request.url).searchParams.get("period") === "year"
        ? "year"
        : "month";
    return HttpResponse.json({ result: respond(period) });
  });

/**
 * The admin dashboard's top 50 sellers (artists) and purchasers (users) by
 * USD revenue, over the past month or year.
 */
const meta = {
  title: "Admin/TopAccountsTables",
  component: TopAccountsTables,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        topAccounts: topAccountsHandler((period) => makeTopAccounts(period)),
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
    await expect(canvas.getByText("listener3@example.com")).toBeInTheDocument();
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

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: {
        topAccounts: topAccountsHandler((period) => makeTopAccounts(period, 0)),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findAllByText("No sales in this period.")
    ).toHaveLength(2);
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        topAccounts: http.get("*/v1/admin/topAccounts", () =>
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
        topAccounts: http.get("*/v1/admin/topAccounts", () =>
          HttpResponse.json({ error: "Something went wrong" }, { status: 500 })
        ),
      },
    },
  },
};
