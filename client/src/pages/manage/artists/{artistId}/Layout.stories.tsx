import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import {
  artistHandlers,
  stripeStatusHandlers,
} from "../../../../../.storybook/handlers";
import {
  ARTIST_EXAMPLE,
  SHARED_ARTIST_EXAMPLE,
} from "../../../../../test/mocks";

import Layout from "./Layout";

const routeFor = (artist: Artist) =>
  reactRouterParameters({
    location: { pathParams: { artistId: String(artist.id) } },
    routing: { path: "/manage/artists/:artistId" },
  });

const noPayments = stripeStatusHandlers({ chargesEnabled: false });

/**
 * The frame around every manage-artist page. The banners at the top depend on
 * how the logged in user relates to the artist.
 */
const meta = {
  title: "ManageArtist/Layout",
  component: Layout,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { artist: artistHandlers(ARTIST_EXAMPLE) } },
    reactRouter: routeFor(ARTIST_EXAMPLE),
  },
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsOwner: Story = {};

/** The owner gets a link to connect their own Stripe account. */
export const AsOwnerWithoutPayments: Story = {
  parameters: { msw: { handlers: { stripe: noPayments } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "by clicking here" })
    ).toBeVisible();
  },
};

const asManager = {
  msw: {
    handlers: {
      artist: artistHandlers(SHARED_ARTIST_EXAMPLE, {
        relationship: "manager",
      }),
    },
  },
  reactRouter: routeFor(SHARED_ARTIST_EXAMPLE),
};

export const AsManager: Story = {
  parameters: asManager,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/You're helping manage this artist/);
    await expect(
      canvas.queryByText("You are viewing this user as their label")
    ).not.toBeInTheDocument();
  },
};

/**
 * A manager can't connect Stripe for the owner, so they're told the owner
 * needs to, rather than being sent to connect their own account.
 */
export const AsManagerWithoutPayments: Story = {
  parameters: {
    ...asManager,
    msw: { handlers: { ...asManager.msw.handlers, stripe: noPayments } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "The owner of this artist hasn't set up payments yet, so fans can't buy anything here."
    );
    await expect(
      canvas.queryByRole("link", { name: "by clicking here" })
    ).not.toBeInTheDocument();
  },
};

export const AsLabel: Story = {
  parameters: {
    msw: {
      handlers: {
        artist: artistHandlers(SHARED_ARTIST_EXAMPLE, { relationship: null }),
      },
    },
    reactRouter: routeFor(SHARED_ARTIST_EXAMPLE),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("You are viewing this user as their label");
  },
};
