import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import ManageMerchPage from "pages/manage/artists/{artistId}/merch/Index";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../../.storybook/handlers";
import {
  ARTIST_EXAMPLE,
  DRAFT_MERCH_EXAMPLE,
  MERCH_EXAMPLE,
} from "../../../../test/mocks";

const MERCH_LIST: Merch[] = [
  MERCH_EXAMPLE,
  DRAFT_MERCH_EXAMPLE,
  {
    ...MERCH_EXAMPLE,
    id: "8b0d5a6e-0000-4000-8000-000000000003",
    title: "Example Album on Limited Edition Transparent Red 12-inch Vinyl",
    catalogNumber: "MIR-002-LP",
    urlSlug: "example-album-vinyl",
    images: [
      {
        id: "merch-image-vinyl",
        merchId: "8b0d5a6e-0000-4000-8000-000000000003",
        imageId: null,
        position: 0,
        url: ["/Logo_Mirlo_InsideCircle.svg"],
        updatedAt: "1999-09-09T09:09:09Z",
        sizes: { 60: "/Logo_Mirlo_InsideCircle.svg" },
      },
    ],
    order: 2,
  },
];

const merchHandlers = (merch: Merch[]) => [
  http.get("*/v1/manage/artists/:artistId/merch", () =>
    HttpResponse.json({ results: merch })
  ),
  http.put("*/v1/manage/artists/:artistId/merchOrder", () =>
    HttpResponse.json({})
  ),
];

/**
 * The artist's merch overview at /manage/artists/:artistId/merch: a
 * drag-to-reorder list of their merch with links to view and edit each item.
 */
const meta = {
  title: "ManageArtist/Merch/ManageMerch",
  component: ManageMerchPage,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        artist: artistHandlers(ARTIST_EXAMPLE),
        merch: merchHandlers(MERCH_LIST),
      },
    },
    reactRouter: reactRouterParameters({
      location: { pathParams: { artistId: String(ARTIST_EXAMPLE.id) } },
      routing: { path: "/manage/artists/:artistId/merch" },
    }),
  },
} satisfies Meta<typeof ManageMerchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(MERCH_EXAMPLE.title);
    for (const item of MERCH_LIST) {
      await expect(canvas.getByText(item.title)).toBeInTheDocument();
    }
    // Only the unpublished item is flagged
    await expect(canvas.getAllByText("Not published yet")).toHaveLength(1);
  },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: { merch: merchHandlers([]) } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Add new merch");
    await expect(
      canvas.queryByText(MERCH_EXAMPLE.title)
    ).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        artist: http.get("*/v1/manage/artists/:artistId", () =>
          delay("infinite")
        ),
        merch: http.get("*/v1/manage/artists/:artistId/merch", () =>
          delay("infinite")
        ),
      },
    },
  },
};
