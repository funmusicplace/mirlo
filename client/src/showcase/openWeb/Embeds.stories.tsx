import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import TrackGroupEmbed from "components/TrackGroup/TrackGroupEmbed";
import { clearPlayerQueue } from "components/Widget/widgetStoryUtils";
import PostWidgetPage from "pages/widget/post/{id}/Index";
import TrackWidgetPage from "pages/widget/track/{id}/Index";
import TrackGroupWidgetPage from "pages/widget/trackgroup/{id}/Index";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { GlobalStateProvider } from "state/GlobalState";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { COVERS, RELEASES, SHOWCASE_ARTIST } from "../shared/fixtures";
import { authAs, recordingViewport } from "../shared/helpers";

import { OPEN_WEB_POST, widgetHandlers } from "./openWebFixtures";
import { useLocalWidgetPreviews } from "./widgetPreviews";

/**
 * Mirlo's embeddable players for releases, tracks and posts, as a blog would
 * show them, plus the "Embed or share" picker that hands out the iframe code.
 * The bare widgets have their own stories under Widget/.
 */

const RELEASE = RELEASES.tidal;
const TRACK = RELEASES.moss.tracks[1];

const meta = {
  title: "Showcase/Embeds",
  // Start every story with an empty player queue, so nothing played in an
  // earlier take shows up as already loaded
  beforeEach: clearPlayerQueue,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: { auth: authAs(null), widget: widgetHandlers } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Renders a widget page directly at its embed size. The widgets size
 * themselves to the iframe viewport (h-screen / w-screen), so those are
 * pinned to the frame here. Each frame gets its own route location, so it
 * reads its own :id and ?variant like it would inside a real iframe.
 */
const WidgetFrame: React.FC<{
  path: string;
  route: string;
  height: number;
  children: React.ReactElement;
}> = ({ path, route, height, children }) => (
  <div
    className="my-8 overflow-hidden rounded shadow-sm [&_.h-screen]:h-full! [&_.w-screen]:w-full! [&>div]:h-full"
    style={{ height, fontFamily: "var(--mi-font-family-stack)" }}
  >
    {/* Its own player state, as each real iframe would have */}
    <GlobalStateProvider>
      <Routes location={path}>
        <Route path={route} element={children} />
      </Routes>
    </GlobalStateProvider>
  </div>
);

const BlogPost: React.FC = () => (
  <div className="min-h-screen bg-[#fbfaf7] font-serif text-[#222]">
    <header className="border-b border-[#e7e2d8] bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-2xl font-bold italic tracking-tight">
          The Quiet Shelf
        </span>
        <nav className="flex gap-6 font-sans text-sm text-[#666]">
          <span>Reviews</span>
          <span>Interviews</span>
          <span>Mixtapes</span>
          <span>About</span>
        </nav>
      </div>
    </header>
    <article className="mx-auto max-w-2xl px-6 py-10">
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-[#b0533c]">
        Album review
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-tight">
        {SHOWCASE_ARTIST.name} find the slow centre of winter on “
        {RELEASE.title}”
      </h1>
      <p className="mt-3 font-sans text-sm text-[#777]">
        By Priya Raman · September 24, 2026 · 4 min read
      </p>
      <p className="mt-8 text-lg leading-relaxed">
        There is a harmonium on almost every song here, but it never sounds like
        the same instrument twice. Recorded over a long winter in a converted
        boathouse, the Halifax duo's third album breathes like the harbour it
        was made beside. Press play and read on:
      </p>
      <WidgetFrame
        path={`/widget/trackGroup/${RELEASE.id}?variant=card`}
        route="/widget/trackGroup/:id"
        height={230}
      >
        <TrackGroupWidgetPage />
      </WidgetFrame>
      <p className="text-lg leading-relaxed">
        Opener “Low Water” sets the pace: tape hiss, a two-note drone, a voice
        that arrives late and leaves early. By “Salt in the Tape” the loops have
        started to warp in the cold, and the band lets them.
      </p>
      <p className="mt-6 text-lg leading-relaxed">
        If you only have three minutes, start with this one from last year's{" "}
        <em>{RELEASES.moss.title}</em>:
      </p>
      <WidgetFrame
        path={`/widget/track/${TRACK.id}?variant=card`}
        route="/widget/track/:id"
        height={130}
      >
        <TrackWidgetPage />
      </WidgetFrame>
      <p className="text-lg leading-relaxed">
        The band also posted three unfinished sketches from the sessions, which
        are worth your time:
      </p>
      <WidgetFrame
        path={`/widget/post/${OPEN_WEB_POST.id}`}
        route="/widget/post/:id"
        height={230}
      >
        <PostWidgetPage />
      </WidgetFrame>
      <p className="font-sans text-sm text-[#777]">
        Every purchase on Mirlo goes straight to the artist.
      </p>
    </article>
  </div>
);

/**
 * A music blog review with the Tidal Hours release widget, a single-track
 * widget and a post widget embedded at their iframe sizes. Record
 * scrolling down the post and pressing play inside an embed.
 */
export const EmbeddedInABlogPost: Story = {
  render: () => <BlogPost />,
  parameters: {
    // Each widget frame renders its own <Routes> below this one
    reactRouter: reactRouterParameters({ routing: { path: "/*" } }),
  },
};

const ReleaseHeader: React.FC = () => (
  <div className="mx-auto mt-16 flex max-w-3xl items-center gap-8 rounded-xl bg-[#f6f1e7] p-8 text-[#0f2d4a] shadow-lg">
    <img
      src={COVERS.tidal.sizes["600"]}
      alt=""
      className="h-48 w-48 rounded-lg shadow"
    />
    <div className="flex-1">
      <p className="text-sm uppercase tracking-widest opacity-70">Album</p>
      <h1 className="mt-1 text-4xl font-bold">{RELEASE.title}</h1>
      <p className="mt-1 text-lg">by {SHOWCASE_ARTIST.name}</p>
      <p className="mt-4 text-sm opacity-80">
        Six songs · Released September 12, 2026
      </p>
    </div>
    <div className="self-start">
      <TrackGroupEmbed trackGroup={RELEASE} />
    </div>
  </div>
);

const embedPickerParameters = {
  msw: {
    handlers: {
      auth: authAs(null),
      widget: widgetHandlers,
    },
  },
  reactRouter: reactRouterParameters({
    location: {
      pathParams: {
        artistId: String(SHOWCASE_ARTIST.urlSlug),
        trackGroupId: String(RELEASE.urlSlug),
      },
    },
    routing: { path: "/:artistId/release/:trackGroupId" },
  }),
};

/**
 * A release header with the "Embed or share" button (top right). Record:
 * click it, flip between the Card / Strip / Strip with tracklist layouts to
 * watch the live preview and iframe code change, then click the code to
 * copy it.
 */
export const EmbedCodePicker: Story = {
  render: () => <ReleaseHeader />,
  decorators: [useLocalWidgetPreviews],
  parameters: embedPickerParameters,
};

/** The same picker, already open on the card layout. */
export const EmbedCodePickerOpen: Story = {
  ...EmbedCodePicker,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByTitle(/embed or share/i, undefined, {
      timeout: 5000,
    });
    await userEvent.click(button);
  },
};
