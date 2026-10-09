import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { USER_EXAMPLE } from "../../../../test/mocks";

import SetupGuide from "./Index";

const handlers = (settings: object = {}) => ({
  auth: [
    http.get("*/auth/profile", () =>
      HttpResponse.json({ result: { ...USER_EXAMPLE, isAdmin: true } })
    ),
    http.post("*/auth/refresh", () => HttpResponse.json({})),
  ],
  settings: [
    http.get("*/admin/settings/", () =>
      HttpResponse.json({
        result: {
          settings: {
            platformPercent: 7,
            instanceCustomization: { title: "Nightjar Records" },
          },
          bucketNames: null,
          ...settings,
        },
      })
    ),
    http.post("*/admin/settings", () => HttpResponse.json({ result: {} })),
    http.get("*/v1/settings/featuredArtists", () =>
      HttpResponse.json({ result: [] })
    ),
    http.post("*/v1/admin/setup/complete", () =>
      HttpResponse.json({ result: {} })
    ),
  ],
});

/**
 * The setup guide an admin lands on after the first launch screens, with the
 * steps that reuse existing settings.
 */
const meta = {
  title: "Admin/SetupGuide",
  component: SetupGuide,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: handlers() },
    reactRouter: reactRouterParameters({ routing: { path: "/admin/setup" } }),
  },
} satisfies Meta<typeof SetupGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {};

/** The instance already has a name and an email provider. */
export const WelcomeWithProgress: Story = {
  parameters: {
    msw: {
      handlers: handlers({
        terms: "Be kind.",
        settings: {
          platformPercent: 7,
          instanceCustomization: { title: "Nightjar Records" },
          emailProvider: {
            provider: "smtp",
            fromEmail: "no-reply@nightjar.test",
          },
        },
      }),
    },
  },
};

export const IdentityStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Start" }));
  },
};

export const EmailStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Start" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
  },
};

export const PlatformPolicyStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Start" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
  },
};

export const DoneStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Start" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
  },
};
