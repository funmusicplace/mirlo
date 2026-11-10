import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  ARTIST,
  VAN,
  VINYL,
  fundraiserMutationHandlers,
} from "components/ManageArtist/Fundraisers/fundraiserStoryFixtures";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../../../../../.storybook/handlers";

import EditFundraiserPage from "./Index";

const fundraiserHandler = (fundraiser: FundraiserSummary) =>
  http.get("*/v1/manage/fundraisers/:fundraiserId", () =>
    HttpResponse.json({ result: fundraiser })
  );

const routeFor = (fundraiser: FundraiserSummary) =>
  reactRouterParameters({
    location: {
      pathParams: {
        artistId: String(ARTIST.id),
        fundraiserId: String(fundraiser.id),
      },
    },
    routing: { path: "/manage/artists/:artistId/fundraisers/:fundraiserId" },
  });

/** Where an artist edits a fundraiser, reached from the Support tab */
const meta = {
  title: "Features/Fundraisers/EditFundraiser",
  component: EditFundraiserPage,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        artist: artistHandlers(ARTIST),
        fundraiser: [fundraiserHandler(VINYL), ...fundraiserMutationHandlers],
      },
    },
    reactRouter: routeFor(VINYL),
  },
} satisfies Meta<typeof EditFundraiserPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LinkedToRelease: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: VINYL.name })
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Tidal Hours" })
    ).toBeInTheDocument();
  },
};

export const Standalone: Story = {
  parameters: {
    msw: {
      handlers: {
        fundraiser: [fundraiserHandler(VAN), ...fundraiserMutationHandlers],
      },
    },
    reactRouter: routeFor(VAN),
  },
};
