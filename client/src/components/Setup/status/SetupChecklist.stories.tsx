import type { Meta, StoryObj } from "@storybook/react";

import SetupChecklist from "./SetupChecklist";
import {
  HEALTHY_SETUP_STATUS,
  TROUBLED_SETUP_STATUS,
} from "./setupStatusMocks";

/**
 * The server checks shown by the System check step of the setup guide and,
 * for the failing ones, by the dashboard card.
 */
const meta = {
  title: "Admin/SetupChecklist",
  component: SetupChecklist,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SetupChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  args: { checks: HEALTHY_SETUP_STATUS.checks },
};

export const WithProblems: Story = {
  args: { checks: TROUBLED_SETUP_STATUS.checks },
};

export const OnlyErrors: Story = {
  args: { checks: TROUBLED_SETUP_STATUS.checks, onlyErrors: true },
};
