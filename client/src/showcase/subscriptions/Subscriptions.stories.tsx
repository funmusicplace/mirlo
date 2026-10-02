import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import ManageArtistIndex from "pages/manage/artists/{artistId}/Index";
import ManageArtistLayout from "pages/manage/artists/{artistId}/Layout";
import ManageTiers from "pages/manage/artists/{artistId}/tiers/Index";
import SupportersPage from "pages/manage/artists/{artistId}/tiers/supporters/Index";

import { AppFrame, appRouting, artistPageRoutes } from "../shared/AppFrame";
import { recordingViewport, TYPING, pause } from "../shared/helpers";

import {
  ARTIST_WITH_TIERS,
  DEMO_TRACKS,
  FAN,
  FOLLOWERS,
  IMPORTED_EMAILS,
  LIGHTHOUSE_TIER,
  LOCKED_POST,
  OWNER,
  PUBLIC_POSTS,
  SUBSCRIBER_POST_WITH_DEMOS,
  SUPPORTERS,
  SUPPORTERS_CSV,
  TIDE_POOL_TIER,
  TIERS,
  followerRow,
  subscribedFan,
} from "./subscriptionsFixtures";

/** The manage pages a supporter-list recording moves between */
const manageRoutes = [
  {
    path: "manage/artists/:artistId",
    element: <ManageArtistLayout />,
    children: [
      {
        path: "",
        element: <ManageArtistIndex />,
        children: [
          { path: "tiers", element: <ManageTiers /> },
          { path: "tiers/supporters", element: <SupportersPage /> },
        ],
      },
    ],
  },
];

const at = (path: string) =>
  appRouting(path, [...artistPageRoutes, ...manageRoutes]);

// --- Mutable mock server state, reset before each story --------------------

let currentUser: LoggedInUser = FAN;
let subscribers = [...SUPPORTERS, ...FOLLOWERS];

const loggedInAs = (user: LoggedInUser) => () => {
  currentUser = user;
};

const isSubscribed = () =>
  !!currentUser.artistUserSubscriptions?.some(
    (s) => !s.artistSubscriptionTier.isDefaultTier
  );

const handlers = {
  auth: [
    http.get("*/auth/profile", () =>
      HttpResponse.json({ result: currentUser })
    ),
    http.post("*/auth/refresh", () => HttpResponse.json({})),
  ],
  instanceArtist: http.get("*/v1/settings/instanceArtist", () =>
    HttpResponse.json({ result: null })
  ),
  artist: [
    http.get("*/v1/manage/artists", () =>
      HttpResponse.json({
        results:
          currentUser.id === OWNER.id
            ? [{ ...ARTIST_WITH_TIERS, relationship: "owner" }]
            : [],
      })
    ),
    http.get("*/v1/manage/artists/:artistId/subscriptionTiers", () =>
      HttpResponse.json({ results: TIERS })
    ),
    http.get("*/v1/manage/artists/:artistId/subscribers", ({ request }) => {
      if (new URL(request.url).searchParams.get("format") === "csv") {
        return new HttpResponse(SUPPORTERS_CSV, {
          headers: { "Content-Type": "text/csv" },
        });
      }
      return HttpResponse.json({ results: subscribers });
    }),
    http.post(
      "*/v1/manage/artists/:artistId/subscribers",
      async ({ request }) => {
        const body = (await request.json()) as {
          subscribers: { email: string }[];
        };
        const added = body.subscribers.map(({ email }, i) =>
          followerRow(
            [email.split("@")[0].replace(/[._]/g, " "), email],
            50 + i
          )
        );
        subscribers = [...subscribers, ...added];
        return HttpResponse.json({ results: added });
      }
    ),
    http.get("*/v1/manage/artists/:artistId", () =>
      HttpResponse.json({ result: ARTIST_WITH_TIERS })
    ),
    http.get("*/v1/artists/:artistId/posts", () =>
      HttpResponse.json({
        results: [
          isSubscribed() ? SUBSCRIBER_POST_WITH_DEMOS : LOCKED_POST,
          ...PUBLIC_POSTS,
        ],
        total: 3,
      })
    ),
    http.get("*/v1/artists/:artistSlug", () =>
      HttpResponse.json({ result: ARTIST_WITH_TIERS })
    ),
    http.get("*/v1/posts/:postId", () =>
      HttpResponse.json({
        result: isSubscribed() ? SUBSCRIBER_POST_WITH_DEMOS : LOCKED_POST,
      })
    ),
    http.get("*/v1/tracks/:trackId", ({ params }) =>
      HttpResponse.json({
        result: DEMO_TRACKS.find((t) => t.id === Number(params.trackId)),
      })
    ),
    http.get("*/v1/labels/:labelSlug/trackGroups", () =>
      HttpResponse.json({ results: [] })
    ),
    // Skip Stripe: signing up applies straight away and returns the fan to
    // the post they were trying to read.
    http.post("*/v1/purchase", async ({ request }) => {
      const body = (await request.json()) as {
        items: { tierId: number; amount?: number }[];
      };
      const [item] = body.items;
      const tier = TIERS.find((t) => t.id === item.tierId) ?? TIDE_POOL_TIER;
      currentUser = subscribedFan(tier, item.amount);
      return HttpResponse.json({
        redirectUrl: `/${ARTIST_WITH_TIERS.urlSlug}/posts/${LOCKED_POST.id}`,
      });
    }),
  ],
};

/**
 * "Patreon, Substack and a record store in one": supporter tiers with
 * included releases, subscriber-only posts, and a supporter list the artist
 * can import and export. Every page is the real routed page with mocked API
 * calls, so links between them work while recording.
 */
const meta = {
  title: "Showcase/Subscriptions",
  component: AppFrame,
  args: { player: true },
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers },
  },
  beforeEach: () => {
    currentUser = FAN;
    subscribers = [...SUPPORTERS, ...FOLLOWERS];
  },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The support tab as a fan sees it: two paid tiers with artwork, perks and
 * included releases. Record: hover the cards, click "Support" on Tide Pool
 * to show the pay-what-you-like amount picker, or "Learn more" to open the
 * tier page.
 */
export const SupportTab: Story = {
  parameters: { reactRouter: at("/lumen-tide/support") },
};

/**
 * The dedicated Lighthouse Keeper tier page: big artwork, price, perks and a
 * grid of every release included in the tier. Record: scroll down to the
 * included releases, hover a cover and hit play, then use the arrows to
 * flip to Tide Pool.
 */
export const TierPage: Story = {
  parameters: { reactRouter: at("/lumen-tide/support/lighthouse-keeper") },
};

/**
 * Pay what you like: the Tide Pool sign-up dialog, opened and ready for an
 * amount. Record: type a new amount (e.g. 8) and click "Let's support". The
 * mock skips Stripe and lands on the now-unlocked subscriber post.
 */
export const ChooseYourAmount: Story = {
  parameters: { reactRouter: at("/lumen-tide/support/tide-pool") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [support] = await canvas.findAllByRole("button", {
      name: /^support$/i,
    });
    await userEvent.click(support);
  },
};

/**
 * A subscriber-only post, seen by a fan who isn't subscribed yet: the title
 * and artwork are public, the body is gated. Record the full journey: click
 * "Support this artist", choose Tide Pool, pick an amount, "Let's support",
 * and you're brought back to the post, now unlocked with playable demos.
 */
export const LockedPost: Story = {
  parameters: { reactRouter: at(`/lumen-tide/posts/${LOCKED_POST.id}`) },
};

/**
 * The same post for a Tide Pool subscriber: full text plus a dock of
 * subscriber-only demos. Record: scroll through the post and play a demo
 * from the dock at the bottom.
 */
export const UnlockedPost: Story = {
  beforeEach: loggedInAs(subscribedFan(TIDE_POOL_TIER, 700)),
  parameters: {
    reactRouter: at(`/lumen-tide/posts/${SUBSCRIBER_POST_WITH_DEMOS.id}`),
  },
};

/**
 * What a Lighthouse Keeper sees on the support tab: their tier, highlighted,
 * with options to manage the subscription. Record: scroll the tier page,
 * then open the "Updates" tab to show the subscriber post sitting alongside
 * public ones.
 */
export const SubscriberSupportTab: Story = {
  beforeEach: loggedInAs(subscribedFan(LIGHTHOUSE_TIER)),
  parameters: { reactRouter: at("/lumen-tide/support") },
};

/**
 * The band's supporter dashboard: monthly income after fees, projected
 * yearly income, and every supporter and newsletter follower. Record:
 * scroll the table, then open the "..." menu to show "Download supporter
 * data" (downloads a real CSV) and the import option.
 */
export const SupportersDashboard: Story = {
  beforeEach: loggedInAs(OWNER),
  parameters: {
    reactRouter: at(`/manage/artists/${ARTIST_WITH_TIERS.id}/tiers/supporters`),
  },
};

/**
 * Bring your community with you: the import dialog, already open with a
 * list of emails pasted in. Record: pick a tier from the dropdown, click
 * "Next", and watch the new followers appear at the bottom of the list.
 */
export const ImportSupporters: Story = {
  beforeEach: loggedInAs(OWNER),
  parameters: {
    reactRouter: at(`/manage/artists/${ARTIST_WITH_TIERS.id}/tiers/supporters`),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const heading = await canvas.findByRole("heading", { name: "Supporters" });
    const menu = heading.parentElement?.querySelector<HTMLElement>(
      '[aria-haspopup="menu"]'
    );
    if (!menu) return;
    await userEvent.click(menu);
    await userEvent.click(
      await body.findByRole("button", { name: /Upload email addresses/ })
    );
    const textarea = await body.findByPlaceholderText(/email1@/);
    await userEvent.click(textarea);
    await pause(TYPING.pauseBefore);
    await userEvent.paste(IMPORTED_EMAILS.join(", "));
  },
};
