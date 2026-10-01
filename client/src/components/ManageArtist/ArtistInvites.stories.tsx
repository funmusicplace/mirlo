import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { ARTIST_MANAGER_INVITE_EXAMPLE } from "../../../test/mocks";

import ArtistInvites from "./ArtistInvites";

let acceptedArtistIds: string[] = [];
let declinedArtistIds: string[] = [];

const handlers = (invites = [ARTIST_MANAGER_INVITE_EXAMPLE]) => [
  http.get("*/v1/manage/artistInvites", () =>
    HttpResponse.json({ results: invites })
  ),
  http.put("*/v1/manage/artistInvites/:artistId", ({ params }) => {
    acceptedArtistIds.push(String(params.artistId));
    return HttpResponse.json({ message: "Success" });
  }),
  http.delete("*/v1/manage/artistInvites/:artistId", ({ params }) => {
    declinedArtistIds.push(String(params.artistId));
    return HttpResponse.json({ message: "Success" });
  }),
];

/**
 * Pending invites for the logged in user to help manage someone else's
 * artist, shown at the top of /manage.
 */
const meta = {
  title: "ManageArtist/ArtistInvites",
  component: ArtistInvites,
  parameters: {
    layout: "padded",
    msw: { handlers: { invites: handlers() } },
  },
  beforeEach: () => {
    acceptedArtistIds = [];
    declinedArtistIds = [];
  },
} satisfies Meta<typeof ArtistInvites>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Invites to manage artists");
    await expect(canvas.getByText("Robin Owner")).toBeVisible();
    await expect(canvas.getByText("The Borrowed Cabin")).toBeVisible();
  },
};

export const MultipleInvites: Story = {
  parameters: {
    msw: {
      handlers: {
        invites: handlers([
          ARTIST_MANAGER_INVITE_EXAMPLE,
          {
            ...ARTIST_MANAGER_INVITE_EXAMPLE,
            profileId: 5,
            artist: { id: 5, name: "Night Shift Choir", urlSlug: "nsc" },
            invitedBy: { id: 6, name: null },
          },
        ]),
      },
    },
  },
};

/** Renders nothing when there are no pending invites. */
export const NoInvites: Story = {
  parameters: { msw: { handlers: { invites: handlers([]) } } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement).toBeEmptyDOMElement());
  },
};

export const Accept: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Accept" })
    );
    await waitFor(() =>
      expect(acceptedArtistIds).toEqual([
        String(ARTIST_MANAGER_INVITE_EXAMPLE.artist.id),
      ])
    );
  },
};

export const Decline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Decline" })
    );
    await waitFor(() =>
      expect(declinedArtistIds).toEqual([
        String(ARTIST_MANAGER_INVITE_EXAMPLE.artist.id),
      ])
    );
    await within(document.body).findByText("Invite declined");
  },
};
