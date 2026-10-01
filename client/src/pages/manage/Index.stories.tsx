import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { ArtistManagerInvite, ManagedArtist } from "queries";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { managedArtistsHandler } from "../../../.storybook/handlers";
import {
  ARTIST_EXAMPLE,
  ARTIST_MANAGER_INVITE_EXAMPLE,
  SHARED_ARTIST_EXAMPLE,
} from "../../../test/mocks";

import ManageIndex from "./Index";

const handlers = ({
  artists = [
    { ...ARTIST_EXAMPLE, relationship: "owner" },
    { ...SHARED_ARTIST_EXAMPLE, relationship: "manager" },
  ],
  invites = [],
}: {
  artists?: ManagedArtist[];
  invites?: ArtistManagerInvite[];
} = {}) => [
  managedArtistsHandler(artists),
  http.get("*/v1/manage/artistInvites", () =>
    HttpResponse.json({ results: invites })
  ),
];

/**
 * /manage: the artists you own, artists other people have shared with you,
 * and any pending invites to manage someone else's artist.
 */
const meta = {
  title: "ManageArtist/ManageIndex",
  component: ManageIndex,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { manage: handlers() } },
    reactRouter: reactRouterParameters({ routing: { path: "/manage" } }),
  },
} satisfies Meta<typeof ManageIndex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnedAndShared: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: ARTIST_EXAMPLE.name });
    await expect(
      canvas.getByRole("heading", { name: "Shared with you" })
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: SHARED_ARTIST_EXAMPLE.name })
    ).toBeVisible();
  },
};

/** No "Shared with you" section when nobody has shared an artist. */
export const OnlyOwned: Story = {
  parameters: {
    msw: {
      handlers: {
        manage: handlers({
          artists: [{ ...ARTIST_EXAMPLE, relationship: "owner" }],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: ARTIST_EXAMPLE.name });
    await expect(
      canvas.queryByRole("heading", { name: "Shared with you" })
    ).not.toBeInTheDocument();
  },
};

export const WithPendingInvite: Story = {
  parameters: {
    msw: {
      handlers: {
        manage: handlers({
          artists: [{ ...ARTIST_EXAMPLE, relationship: "owner" }],
          invites: [ARTIST_MANAGER_INVITE_EXAMPLE],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Invites to manage artists");
    await expect(canvas.getByRole("button", { name: "Accept" })).toBeVisible();
  },
};
