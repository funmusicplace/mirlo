import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { queryInstanceSettings } from "queries/instanceSettings";
import { queryClient } from "queries/QueryClientWrapper";
import { reactRouterParameters } from "storybook-addon-remix-react-router";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";

import { USER_EXAMPLE } from "../../../../test/mocks";

import Welcome from "./Index";

const WELCOME_INSTANCE_SETTINGS = {
  ...DEFAULT_INSTANCE_SETTINGS,
  setupStage: "welcome" as const,
};

const seedInstanceSettings = () => {
  queryClient.setQueryData(
    queryInstanceSettings().queryKey,
    WELCOME_INSTANCE_SETTINGS
  );
  return {};
};

const handlers = ({
  user = { ...USER_EXAMPLE, isAdmin: true },
}: {
  user?: LoggedInUser | null;
} = {}) => ({
  auth: [
    http.get("*/auth/profile", () =>
      user
        ? HttpResponse.json({ result: user })
        : HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),
    http.post("*/auth/login", () => HttpResponse.json({ result: {} })),
    http.post("*/auth/refresh", () => HttpResponse.json({})),
  ],
  settings: [
    http.get("*/admin/settings/", () =>
      HttpResponse.json({
        result: { settings: { platformPercent: 7 }, bucketNames: null },
      })
    ),
    http.get("*/v1/settings/featuredArtists", () =>
      HttpResponse.json({ result: [] })
    ),
  ],
  instance: [
    http.get("*/v1/instance", () =>
      HttpResponse.json({ result: WELCOME_INSTANCE_SETTINGS })
    ),
  ],
});

/**
 * The first launch of a fresh instance: a bare login, then three screens
 * asking for the instance name, a contact email and an accent color.
 */
const meta = {
  title: "Admin/Welcome",
  component: Welcome,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: handlers() },
    reactRouter: reactRouterParameters({ routing: { path: "/admin/welcome" } }),
  },
  loaders: [seedInstanceSettings],
} satisfies Meta<typeof Welcome>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nobody is logged in yet: the admin logs in with the account from the install. */
export const LoggedOut: Story = {
  parameters: { msw: { handlers: handlers({ user: null }) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "Log in with the admin account created during the install."
    );
    await expect(canvas.getByLabelText("Email")).toHaveFocus();
  },
};

export const AdminFirstStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "Before setting up anything, give this music platform instance a name."
    );
  },
};

export const AdminContactStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Instance name"),
      "Nightjar Records"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
    await canvas.findByLabelText("Contact email");
  },
};

export const AdminColorStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Instance name"),
      "Nightjar Records"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
    await canvas.findByRole("button", { name: "Open my platform" });
  },
};

/** A listener who logs in during the setup is told to come back later. */
export const LoggedInListener: Story = {
  parameters: { msw: { handlers: handlers({ user: USER_EXAMPLE }) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "This platform is still being set up by its admin. Come back soon."
    );
  },
};
