import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import PledgesPage from "pages/manage/fundraiser/{fundraiserId}/pledges/Index";
import ManageLayout from "pages/manage/Layout";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../.storybook/handlers";
import { SHOWCASE_ARTIST } from "../shared/fixtures";
import { recordingViewport, authAs } from "../shared/helpers";

import {
  FUNDRAISER_ID,
  makePledges,
  managedFundraiser,
} from "./fundraiserFixtures";

const OWNER: LoggedInUser = {
  id: SHOWCASE_ARTIST.userId,
  email: "hello@lumentide.ca",
  name: "Lumen Tide",
  artists: [SHOWCASE_ARTIST],
  isAdmin: false,
  isLabelAccount: false,
  currency: "usd",
};

const pledgeHandlers = ({ charged }: { charged: boolean }) => ({
  auth: authAs(OWNER),
  artist: artistHandlers(SHOWCASE_ARTIST),
  fundraiser: [
    http.get("*/v1/manage/fundraisers/:fundraiserId/pledges", ({ request }) => {
      const includeCancelled =
        new URL(request.url).searchParams.get("includeCancelled") === "true";
      const results = makePledges({ charged, includeCancelled });
      return HttpResponse.json({ results, total: results.length });
    }),
    http.get("*/v1/manage/fundraisers/:fundraiserId", () =>
      HttpResponse.json({ result: managedFundraiser(charged ? 1 : 18) })
    ),
  ],
});

/** The pledges page inside the /manage layout, as the artist sees it */
const PledgesInManageLayout = () => <ManageLayout />;

/**
 * The artist's view of everyone who has pledged toward pressing "Tidal
 * Hours" on vinyl: totals up top, then every backer with their amount and
 * whether their card has been charged yet.
 */
const meta = {
  title: "Showcase/Fundraisers/Artist pledges",
  component: PledgesInManageLayout,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: pledgeHandlers({ charged: false }) },
    reactRouter: reactRouterParameters({
      location: {
        path: `/manage/fundraiser/${FUNDRAISER_ID}/pledges`,
      },
      routing: {
        path: "/manage",
        useStoryElement: true,
        children: [
          {
            path: "fundraiser/:fundraiserId/pledges",
            element: <PledgesPage />,
          },
        ],
      },
    }),
  },
} satisfies Meta<typeof PledgesInManageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Mid-campaign: 20 backers, all pending because nobody is charged until the
 * goal is met. Record scrolling the list, then switch the filter to "All
 * pledges" to reveal one cancelled pledge.
 */
export const PendingPledges: Story = {};

/**
 * After the goal was reached and the artist charged pledges: every backer
 * now shows as paid.
 */
export const PledgesCharged: Story = {
  parameters: { msw: { handlers: pledgeHandlers({ charged: true }) } },
};
