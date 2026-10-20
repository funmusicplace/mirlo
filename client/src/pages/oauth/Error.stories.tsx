import type { Meta, StoryObj } from "@storybook/react";
import { within } from "@storybook/test";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import OAuthError from "./Error";

const meta = {
  title: "OAuth/Error",
  component: OAuthError,
  parameters: {
    layout: "fullscreen",
    reactRouter: reactRouterParameters({
      location: {
        searchParams: {
          error: "invalid_request",
          error_description:
            "redirect_uri did not match any of the client's registered redirect_uris",
        },
      },
      routing: { path: "/oauth/error" },
    }),
  },
} satisfies Meta<typeof OAuthError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnregisteredRedirect: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Couldn't connect the app");
    await canvas.findByText(
      "redirect_uri did not match any of the client's registered redirect_uris"
    );
  },
};
