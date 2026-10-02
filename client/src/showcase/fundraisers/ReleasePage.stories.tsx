import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import ReleasePage from "pages/{artistId}/release/{trackGroupId}/Index";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../.storybook/handlers";
import { withArtistColors } from "../shared/AppFrame";
import { RELEASES, SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import { recordingViewport } from "../shared/helpers";

import {
  ACTIVE_CAMPAIGN,
  FAN_USER,
  FUNDED_CAMPAIGN,
  FUNDRAISER_ID,
  fundraiserRelease,
  GOAL_CENTS,
  makeFundraiser,
} from "./fundraiserFixtures";

const releaseHandlers = ({
  daysLeft,
  raisedCents,
  supporters,
  user = FAN_USER,
  funded = false,
  recommended = [RELEASES.moss, RELEASES.ember],
}: {
  recommended?: TrackGroup[];
  daysLeft: number;
  funded?: boolean;
  raisedCents: number;
  supporters: number;
  user?: LoggedInUser;
}) => {
  const trackGroup = fundraiserRelease(makeFundraiser({ daysLeft, funded }));
  return {
    auth: [
      http.get("*/auth/profile", () => HttpResponse.json({ result: user })),
      http.post("*/auth/refresh", () => HttpResponse.json({})),
    ],
    artist: artistHandlers(SHOWCASE_ARTIST_WITH_RELEASES, {
      relationship: null,
    }),
    release: [
      http.get("*/v1/trackGroups/:trackGroupId/supporters/", () =>
        HttpResponse.json({
          results: [],
          total: supporters,
          totalAmount: raisedCents,
          totalSupporters: supporters,
        })
      ),
      http.get("*/v1/trackGroups/:trackGroupId/recommendedTrackGroups", () =>
        HttpResponse.json({ results: recommended })
      ),
      // Stripe redirects back with ?setup_intent=... after a pledge
      http.get("*/v1/stripe/setupIntentStatus", () =>
        HttpResponse.json({
          result: { status: "succeeded", paymentIntentAmount: 3500 },
        })
      ),
      http.get("*/v1/trackGroups/:trackGroupSlug/", () =>
        HttpResponse.json({ result: trackGroup })
      ),
    ],
  };
};

const RELEASE_PATH_PARAMS = {
  artistId: SHOWCASE_ARTIST_WITH_RELEASES.urlSlug ?? "",
  trackGroupId: RELEASES.tidal.urlSlug ?? "",
};

/**
 * The public release page for "Tidal Hours" while Lumen Tide run an
 * all-or-nothing fundraiser to press it on vinyl. Backers pledge and are
 * only charged if the goal is reached.
 */
const meta = {
  title: "Showcase/Fundraisers/Release page",
  component: ReleasePage,
  decorators: [withArtistColors],
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: releaseHandlers({
        daysLeft: 18,
        raisedCents: ACTIVE_CAMPAIGN.raisedCents,
        supporters: ACTIVE_CAMPAIGN.backers,
      }),
    },
    reactRouter: reactRouterParameters({
      location: {
        pathParams: RELEASE_PATH_PARAMS,
      },
      routing: { path: "/:artistId/release/:trackGroupId" },
    }),
  },
} satisfies Meta<typeof ReleasePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 40% funded, 18 days to go. Record the campaign blurb, the thermometer and
 * the "Back this project" button, then scroll down to the tracklist.
 */
export const FortyPercentFunded: Story = {};

/**
 * 92% funded with 3 days left: the "last push" post. Record the nearly full
 * thermometer.
 */
export const NearlyFunded: Story = {
  parameters: {
    msw: {
      handlers: releaseHandlers({
        daysLeft: 3,
        raisedCents: 368500,
        supporters: 97,
      }),
    },
  },
};

/**
 * The goal is met ($4,385 of $4,000) and pledges will be charged. Record the
 * full thermometer as the "we did it" post.
 */
export const GoalReached: Story = {
  parameters: {
    msw: {
      handlers: releaseHandlers({
        daysLeft: 1,
        raisedCents: FUNDED_CAMPAIGN.raisedCents,
        supporters: FUNDED_CAMPAIGN.backers,
        funded: true,
      }),
    },
  },
};

/**
 * The pledge modal opens on load: pick an amount and read "You're pledging
 * to support this project if it meets its fundraising goal". Record typing a
 * bigger amount and ticking the consent checkbox.
 */
export const PledgeModalOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [button] = await canvas.findAllByRole(
      "button",
      { name: "Back this project" },
      { timeout: 5000 }
    );
    await userEvent.click(button);
  },
};

/**
 * The fan has already pledged $35: the button is replaced by "You're backing
 * this project", with the option to change or cancel the pledge.
 */
export const AlreadyBacking: Story = {
  parameters: {
    msw: {
      handlers: releaseHandlers({
        daysLeft: 18,
        raisedCents: ACTIVE_CAMPAIGN.raisedCents,
        supporters: ACTIVE_CAMPAIGN.backers,
        user: {
          ...FAN_USER,
          pledges: [
            {
              fundraiserId: FUNDRAISER_ID,
              amount: 3500,
              fundraiser: { goalAmount: GOAL_CENTS, isAllOrNothing: true },
            },
          ],
        },
      }),
    },
  },
};

/**
 * Straight after pledging: Stripe sends the fan back here and the page
 * thanks them with confetti, "You will be charged when it's fully funded",
 * share buttons and more from the artist. Record the confetti on load.
 */
export const JustPledged: Story = {
  parameters: {
    msw: {
      handlers: releaseHandlers({
        daysLeft: 18,
        raisedCents: ACTIVE_CAMPAIGN.raisedCents + 3500,
        supporters: ACTIVE_CAMPAIGN.backers + 1,
        // The thank-you panel has room for one recommendation
        recommended: [RELEASES.moss],
      }),
    },
    reactRouter: reactRouterParameters({
      location: {
        pathParams: RELEASE_PATH_PARAMS,
        searchParams: { setup_intent: "seti_1Q8tidalhours" },
      },
      routing: { path: "/:artistId/release/:trackGroupId" },
    }),
  },
};
