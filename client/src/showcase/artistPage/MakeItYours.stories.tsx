import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent, within } from "@storybook/test";
import ArtistColorsProvider from "components/ArtistColorsProvider";
import { http, HttpResponse } from "msw";
import CustomizeArtistPage from "pages/manage/artists/{artistId}/customize/Index";
import ManageArtistLayout from "pages/manage/artists/{artistId}/Layout";
import ArtistIndex from "pages/{artistId}/Index";
import ArtistLayout from "pages/{artistId}/Layout";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { managedArtistsHandler } from "../../../.storybook/handlers";
import { ARTIST_MANAGER_EXAMPLE } from "../../../test/mocks";
import { AppFrame, AppChrome, appRouting } from "../shared/AppFrame";
import { pause, recordingViewport } from "../shared/helpers";

import {
  FULL_ARTIST,
  THEMES,
  paymentsEnabled,
  publicArtistHandlers,
} from "./artistPageData";

// Three releases per row so the scaled-down page fills the preview pane.
const ARTIST: Artist = {
  ...FULL_ARTIST,
  properties: { ...FULL_ARTIST.properties, releasesPerRow: 3 },
};

let serverArtist: Artist = ARTIST;

// The owner is the logged-in user from the default `auth` handler (id 1).
const customizeHandlers = [
  http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
    const body = (await request.json()) as Partial<Artist>;
    serverArtist = { ...serverArtist, ...body };
    return HttpResponse.json({ result: serverArtist });
  }),
  http.get("*/v1/manage/artists/:artistId/labels", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/manage/artists/:artistId/managers", () =>
    HttpResponse.json({
      results: [
        {
          ...ARTIST_MANAGER_EXAMPLE,
          user: { ...ARTIST_MANAGER_EXAMPLE.user, name: "Mara Doucette" },
        },
      ],
    })
  ),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
  http.get("*/v1/manage/artists/:artistId", () =>
    HttpResponse.json({ result: serverArtist })
  ),
  managedArtistsHandler([{ ...ARTIST, relationship: "owner" }]),
  http.get("*/v1/notifications*", () => HttpResponse.json({ results: [] })),
];

const handlers = {
  // Before `artist`, so `artists/testExistence` isn't caught by its
  // `artists/:artistSlug` handler.
  customize: customizeHandlers,
  artist: publicArtistHandlers(() => serverArtist),
  stripe: paymentsEnabled,
};

/**
 * Side by side: the customise form on the left, and the public artist page
 * on the right, both under one ArtistColorsProvider so colour changes show
 * on the page before saving. The page is rendered at full desktop width and
 * scaled down to fit.
 */
const SplitPreview = () => (
  <ArtistColorsProvider>
    <div className="flex h-screen overflow-hidden">
      <div
        id="customize-pane"
        className="w-[460px] shrink-0 h-full overflow-y-auto border-r border-black/10 bg-white text-black"
      >
        <CustomizeArtistPage />
      </div>
      <div className="relative grow h-full overflow-hidden">
        <div
          className="absolute top-0 left-0 w-[1280px] h-[1220px] overflow-y-auto origin-top-left"
          style={{ transform: "scale(0.64)" }}
        >
          <AppChrome />
        </div>
      </div>
    </div>
  </ArtistColorsProvider>
);

const meta = {
  title: "Showcase/Make it yours",
  component: SplitPreview,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers },
    // The artist is addressed by id ("7") so the same URL param works for the
    // manage form (which looks the artist up by id) and the public page.
    reactRouter: reactRouterParameters({
      location: { path: `/${FULL_ARTIST.id}` },
      routing: {
        path: "/",
        useStoryElement: true,
        children: [
          {
            path: ":artistId",
            element: <ArtistLayout />,
            children: [{ path: "", element: <ArtistIndex /> }],
          },
        ],
      },
    }),
  },
  beforeEach: () => {
    serverArtist = ARTIST;
  },
} satisfies Meta<typeof SplitPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const scrollToColours = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const legend = await canvas.findByText("Custom colors", undefined, {
    timeout: 5000,
  });
  legend.scrollIntoView({ block: "start" });
  return canvas;
};

const setColour = (input: HTMLElement, value: string) => {
  fireEvent.input(input, { target: { value } });
  fireEvent.change(input, { target: { value } });
};

const applyTheme = async (
  canvas: ReturnType<typeof within>,
  colors: ArtistColors
) => {
  const fields: [keyof ArtistColors, string][] = [
    ["background", "Background color"],
    ["text", "Text color"],
    ["button", "Button / link color"],
    ["buttonText", "Button text color"],
  ];
  for (const [key, label] of fields) {
    const value = colors[key];
    if (value) {
      setColour(await canvas.findByLabelText(label), value);
    }
  }
};

/**
 * The colour controls next to the live page. Record clicking a colour
 * swatch (e.g. "Background color") and picking a new colour — the page on
 * the right updates as you drag, before anything is saved.
 */
export const LivePreview: Story = {
  play: async ({ canvasElement }) => {
    await scrollToColours(canvasElement);
  },
};

/**
 * Hands-free: cycles the page through the Tide, Ember Rooms and Moss Choir
 * themes every 2.5 seconds (three rounds), as if someone were changing the
 * colour inputs. Start recording, then reload the story.
 */
export const CycleThemes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await scrollToColours(canvasElement);
    const themes = [THEMES.ember, THEMES.moss, THEMES.tide];
    for (let round = 0; round < 3; round++) {
      for (const theme of themes) {
        await pause(2500);
        await applyTheme(canvas, theme);
      }
    }
  },
};

/**
 * The full customise page as the artist sees it, inside the manage layout:
 * the header and banner above the form recolour live as the colours change.
 * Scroll down for "Custom tab names", tab order and layout settings.
 */
export const CustomizePage: Story = {
  render: () => <AppFrame />,
  parameters: {
    reactRouter: appRouting(`/manage/artists/${FULL_ARTIST.id}/customize`, [
      {
        path: "manage/artists/:artistId",
        element: <ManageArtistLayout />,
        children: [{ path: "customize", element: <CustomizeArtistPage /> }],
      },
    ]),
  },
};

/**
 * The customise page scrolled to the custom tab titles: drag a tab to
 * reorder it, or type a new name. Compare with the `CustomTabs` story under
 * "Showcase/Artist page" for the result.
 */
export const TabNamesAndOrder: Story = {
  ...CustomizePage,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = await canvas.findByRole(
      "heading",
      { name: "Custom tab titles" },
      { timeout: 5000 }
    );
    heading.scrollIntoView({ block: "start" });
    window.scrollBy(0, -120);
  },
};
