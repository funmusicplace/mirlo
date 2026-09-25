import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";

import {
  makeAdminStats,
  makeTopAccounts,
  TOP_SELLER_NAME,
} from "../../../../test/mocks";

import AdminDashboard from "./Index";

const statsHandler = http.get("*/v1/admin/stats", ({ request }) =>
  HttpResponse.json({
    result: makeAdminStats(
      new URL(request.url).searchParams.get("granularity") === "month"
        ? "month"
        : "week"
    ),
  })
);

const topAccountsHandler = http.get("*/v1/admin/topAccounts", ({ request }) =>
  HttpResponse.json({
    result: makeTopAccounts(
      new URL(request.url).searchParams.get("period") === "year"
        ? "year"
        : "month"
    ),
  })
);

const meta = {
  title: "Admin/Dashboard",
  component: AdminDashboard,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: { stats: statsHandler, topAccounts: topAccountsHandler },
    },
  },
} satisfies Meta<typeof AdminDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("USD Revenue Per Week");
    await canvas.findByText(TOP_SELLER_NAME);
  },
};

export const Monthly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("USD Revenue Per Week");
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: /Show results by/ }),
      "month"
    );
    await expect(
      await canvas.findByText("USD Revenue Per Month")
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        stats: http.get("*/v1/admin/stats", () => delay("infinite")),
      },
    },
  },
};

export const Failed: Story = {
  parameters: {
    msw: {
      handlers: {
        stats: http.get("*/v1/admin/stats", () =>
          HttpResponse.json({ error: "Something went wrong" }, { status: 500 })
        ),
      },
    },
  },
};
