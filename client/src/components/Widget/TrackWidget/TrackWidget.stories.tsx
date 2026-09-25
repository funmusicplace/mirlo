import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import TrackWidgetPage from "pages/widget/track/{id}/Index";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import {
  ARTIST_EXAMPLE,
  DRAFTS_ALBUM_TRACK_EXAMPLE,
  TRACK_EXAMPLE,
} from "../../../../test/mocks";

const tracks = [TRACK_EXAMPLE, DRAFTS_ALBUM_TRACK_EXAMPLE];

const widgetHandlers = [
  http.get("*/v1/tracks/:id", ({ params }) => {
    const track = tracks.find((t) => t.id === Number(params.id));
    return track
      ? HttpResponse.json({ result: track })
      : HttpResponse.json({ error: "Track not found" }, { status: 404 });
  }),
  http.get("*/v1/artists/:id", () =>
    HttpResponse.json({ result: ARTIST_EXAMPLE })
  ),
];

const widgetRoute = (trackId: number, variant: "card" | "strip") =>
  reactRouterParameters({
    location: {
      pathParams: { id: String(trackId) },
      searchParams: { variant },
    },
    routing: { path: "/widget/track/:id" },
  });

/**
 * The embeddable track widget, as served at /widget/track/:id and embedded in
 * posts and on third-party sites. `?variant=` picks the Card or Strip layout.
 */
const meta = {
  title: "Widget/TrackWidget",
  component: TrackWidgetPage,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { widget: widgetHandlers } },
  },
} satisfies Meta<typeof TrackWidgetPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const expectReleaseTrack = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await canvas.findByText(TRACK_EXAMPLE.title!);
  await expect(canvas.getByText("from")).toBeInTheDocument();
  await expect(
    canvas.getByRole("link", { name: TRACK_EXAMPLE.trackGroup.title })
  ).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Buy" })).toHaveAttribute(
    "href",
    expect.stringContaining("/release/example-album/tracks/42?buy=true")
  );
};

// Tracks uploaded to a post live in a hidden drafts album that has no public
// page (#2372), so the widget mustn't link to it or offer to sell it.
const expectDraftsAlbumTrack = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await canvas.findByText(DRAFTS_ALBUM_TRACK_EXAMPLE.title!);
  await expect(canvas.queryByText("from")).not.toBeInTheDocument();
  await expect(canvas.queryByText("Untitled")).not.toBeInTheDocument();
  await expect(
    canvas.queryByRole("link", { name: "Buy" })
  ).not.toBeInTheDocument();
  await expect(
    canvas.getByRole("link", { name: TRACK_EXAMPLE.trackGroup.artist.name })
  ).toBeInTheDocument();
};

export const Card: Story = {
  parameters: { reactRouter: widgetRoute(TRACK_EXAMPLE.id, "card") },
  play: ({ canvasElement }) => expectReleaseTrack(canvasElement),
};

export const Strip: Story = {
  parameters: { reactRouter: widgetRoute(TRACK_EXAMPLE.id, "strip") },
  play: ({ canvasElement }) => expectReleaseTrack(canvasElement),
};

export const CardDraftsAlbumTrack: Story = {
  parameters: {
    reactRouter: widgetRoute(DRAFTS_ALBUM_TRACK_EXAMPLE.id, "card"),
  },
  play: ({ canvasElement }) => expectDraftsAlbumTrack(canvasElement),
};

export const StripDraftsAlbumTrack: Story = {
  parameters: {
    reactRouter: widgetRoute(DRAFTS_ALBUM_TRACK_EXAMPLE.id, "strip"),
  },
  play: ({ canvasElement }) => expectDraftsAlbumTrack(canvasElement),
};

export const TrackNotFound: Story = {
  parameters: { reactRouter: widgetRoute(404, "card") },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("That track doesn't exist")
    ).toBeInTheDocument();
  },
};
