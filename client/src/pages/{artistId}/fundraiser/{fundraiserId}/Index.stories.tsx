import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  ARTIST,
  PUBLIC_VINYL,
  publicFundraiserHandler,
} from "components/ManageArtist/Fundraisers/fundraiserStoryFixtures";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../../../.storybook/handlers";

import FundraiserPage from "./Index";

const route = reactRouterParameters({
  location: {
    pathParams: { artistId: "tidal-hours", fundraiserId: "vinyl" },
  },
  routing: { path: "/:artistId/fundraiser/:fundraiserId" },
});

/** A fundraiser's public page, at /:artist/fundraiser/:slug */
const meta = {
  title: "Features/Fundraisers/FundraiserPage",
  component: FundraiserPage,
  parameters: {
    layout: "fullscreen",
    reactRouter: route,
    msw: {
      handlers: {
        artist: artistHandlers(ARTIST),
        fundraiser: publicFundraiserHandler(PUBLIC_VINYL),
      },
    },
  },
} satisfies Meta<typeof FundraiserPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithVideoAndImages: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: PUBLIC_VINYL.name })
    ).toBeInTheDocument();
    await expect(canvas.getByTitle("Fundraiser video")).toBeInTheDocument();
    await expect(
      canvas.getByText("$3,125.00 out of $5,000.00 raised")
    ).toBeInTheDocument();
    await expect(canvas.getByText("sea-glass blue vinyl").tagName).toBe(
      "STRONG"
    );
    await expect(
      canvas.getByRole("link", { name: "Tidal Hours" })
    ).toHaveAttribute("href", "/tidal-hours/release/tidal-hours");
  },
};

/** No video, no images, no linked release */
export const TextOnly: Story = {
  parameters: {
    msw: {
      handlers: {
        fundraiser: publicFundraiserHandler({
          ...PUBLIC_VINYL,
          videoEmbedUrl: null,
          images: [],
          trackGroups: [],
          endDate: null,
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { name: PUBLIC_VINYL.name });
    await expect(
      canvas.queryByTitle("Fundraiser video")
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Ends on/)).not.toBeInTheDocument();
  },
};

export const NotFound: Story = {
  parameters: {
    msw: {
      handlers: {
        fundraiser: http.get("*/v1/fundraisers/:fundraiserId", () =>
          HttpResponse.json({ error: "Fundraiser not found" }, { status: 404 })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("This fundraiser doesn't exist.")
    ).toBeInTheDocument();
  },
};
