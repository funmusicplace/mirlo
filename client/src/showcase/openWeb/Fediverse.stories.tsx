import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import CustomizeArtistPage from "pages/manage/artists/{artistId}/customize/Index";
import ArtistIndex from "pages/{artistId}/Index";
import ArtistLayout from "pages/{artistId}/Layout";
import React from "react";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import {
  artistHandlers,
  stripeStatusHandlers,
} from "../../../.storybook/handlers";
import { withArtistColors } from "../shared/AppFrame";
import { SHOWCASE_ARTIST } from "../shared/fixtures";
import { authAs, recordingViewport } from "../shared/helpers";

import { OPEN_WEB_ARTIST } from "./openWebFixtures";

/**
 * Following a Mirlo artist from Mastodon or any other fediverse server: the
 * fan types their own handle and is sent to their home server to confirm.
 */

const ACTOR_HANDLE = `@${SHOWCASE_ARTIST.urlSlug}@mirlo.space`;

const fediverseHandlers = [
  http.get("*/v1/artists/:artistId/remoteFollow", async ({ request }) => {
    const handle = new URL(request.url).searchParams.get("handle") ?? "";
    await delay(700);
    // The real endpoint WebFingers the fan's server and returns its follow
    // screen. Here we land on a local mock of that screen instead.
    const params = new URLSearchParams({
      handle,
      artist: SHOWCASE_ARTIST.name,
      actor: ACTOR_HANDLE,
    });
    return HttpResponse.json({
      result: { redirectUrl: `/showcase/fediverse-follow.html?${params}` },
    });
  }),
  http.get("*/v1/artists/:artistSlug/labels", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/labels/:artistSlug/trackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/artists/:artistId/purchaseCatalogue", () =>
    HttpResponse.json({ result: { price: 2400 } })
  ),
  http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: OPEN_WEB_ARTIST })
  ),
];

// The Cloudflare test widget prints "For testing only" under the email form
const hideCaptcha = <style>{"#cf-turnstile { display: none; }"}</style>;

const withHiddenCaptcha: Decorator = (Story) => (
  <>
    {hideCaptcha}
    <Story />
  </>
);

const artistPageRoute = reactRouterParameters({
  location: { pathParams: { artistId: String(SHOWCASE_ARTIST.urlSlug) } },
  routing: {
    path: "/:artistId",
    useStoryElement: true,
    children: [{ index: true, element: <ArtistIndex /> }],
  },
});

const meta = {
  title: "Showcase/Fediverse",
  component: ArtistLayout,
  decorators: [withHiddenCaptcha, withArtistColors],
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        auth: authAs(null),
        stripe: stripeStatusHandlers({ chargesEnabled: true }),
        fediverse: fediverseHandlers,
      },
    },
    reactRouter: artistPageRoute,
  },
} satisfies Meta<typeof ArtistLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const openFollowModal = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const follow = await canvas.findByRole(
    "button",
    { name: /follow/i },
    { timeout: 5000 }
  );
  await userEvent.click(follow);
  return within(document.body).findByPlaceholderText(/^@you@/, undefined, {
    timeout: 5000,
  });
};

const scrollToFediverseForm = (input: HTMLElement) =>
  input.closest("form")?.scrollIntoView({ block: "end" });

/**
 * Lumen Tide's artist page, seen by a logged-out fan. Record: click
 * "Follow", scroll the pop-up to "Or follow from the fediverse", type a
 * handle like @marta@harbour.social and press "Continue to your server". It
 * lands on a mock of the fan's own server asking them to confirm the follow.
 */
export const FollowFromMastodon: Story = {};

/**
 * Same as above with the follow pop-up already open and the fediverse field
 * focused, ready to type a handle.
 */
export const FollowModalOpen: Story = {
  play: async ({ canvasElement }) => {
    const input = await openFollowModal(canvasElement);
    scrollToFediverseForm(input);
    input.focus();
  },
};

/**
 * The pop-up with a handle already typed. Just press "Continue to your
 * server" to show the hand-off to the fan's own server.
 */
export const FollowModalFilledIn: Story = {
  play: async ({ canvasElement }) => {
    const input = await openFollowModal(canvasElement);
    scrollToFediverseForm(input);
    await userEvent.type(input, "@marta@harbour.social", { delay: 40 });
  },
};

/** The settings page previews the banner at a 625px size */
const SETTINGS_ARTIST: Artist = {
  ...OPEN_WEB_ARTIST,
  activityPub: false,
  background: SHOWCASE_ARTIST.background && {
    ...SHOWCASE_ARTIST.background,
    sizes: {
      ...SHOWCASE_ARTIST.background.sizes,
      original: SHOWCASE_ARTIST.background.url,
      625: SHOWCASE_ARTIST.background.url,
    },
  },
};

let serverArtist: Artist = SETTINGS_ARTIST;

/**
 * Artist side: the "Enable The Social Web" toggle on the profile settings
 * page, scrolled into view and switched off. Record flipping it on, then
 * "Save changes" at the bottom of the form.
 */
export const ArtistEnablesSocialWeb: Story = {
  render: () => <CustomizeArtistPage />,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-4xl p-6">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    serverArtist = SETTINGS_ARTIST;
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        auth: authAs({
          id: SHOWCASE_ARTIST.userId,
          email: "hello@lumentide.ca",
          name: "Ines Moreau",
          artists: [SHOWCASE_ARTIST],
          isAdmin: false,
          isLabelAccount: false,
          currency: "usd",
        }),
        fediverse: [
          http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
            const body = (await request.json()) as Partial<Artist>;
            serverArtist = { ...serverArtist, ...body };
            return HttpResponse.json({ result: serverArtist });
          }),
          http.get("*/v1/manage/artists/:artistId/labels", () =>
            HttpResponse.json({ results: [] })
          ),
          http.get("*/v1/manage/artists/:artistId/managers", () =>
            HttpResponse.json({ results: [] })
          ),
          http.get("*/v1/artists/testExistence", () =>
            HttpResponse.json({ result: { exists: false } })
          ),
        ],
        artist: artistHandlers(() => serverArtist),
      },
    },
    reactRouter: reactRouterParameters({
      location: { pathParams: { artistId: String(SHOWCASE_ARTIST.id) } },
      routing: { path: "/manage/artists/:artistId/customize" },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByText("Enable The Social Web", undefined, {
      timeout: 5000,
    });
    toggle.scrollIntoView({ block: "center" });
  },
};
