import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { ArtistManager, ManagedArtist } from "queries";

import { managedArtistsHandler } from "../../../../.storybook/handlers";
import {
  ARTIST_EXAMPLE,
  ARTIST_MANAGER_EXAMPLE,
  CURRENT_USER_AS_MANAGER_EXAMPLE,
  PENDING_ARTIST_MANAGER_EXAMPLE,
  SHARED_ARTIST_EXAMPLE,
} from "../../../../test/mocks";

import ArtistManagers from "./ArtistManagers";

// Requests the component sends, so play functions can check them.
let invitedEmails: string[] = [];
let removedUserIds: string[] = [];
let leftArtistIds: string[] = [];

const handlers = ({
  managers = [ARTIST_MANAGER_EXAMPLE, PENDING_ARTIST_MANAGER_EXAMPLE],
  managedArtists = [{ ...ARTIST_EXAMPLE, relationship: "owner" }],
  inviteStatus = 200,
}: {
  managers?: ArtistManager[];
  managedArtists?: ManagedArtist[];
  inviteStatus?: number;
} = {}) => [
  managedArtistsHandler(managedArtists),
  http.get("*/v1/manage/artists/:artistId/managers", () =>
    HttpResponse.json({ results: managers })
  ),
  http.post("*/v1/manage/artists/:artistId/managers", async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    invitedEmails.push(email);
    if (inviteStatus !== 200) {
      return HttpResponse.json(
        { error: "Invite failed" },
        { status: inviteStatus }
      );
    }
    return HttpResponse.json({ results: managers });
  }),
  http.delete(
    "*/v1/manage/artists/:artistId/managers/:userId",
    ({ params }) => {
      removedUserIds.push(String(params.userId));
      return HttpResponse.json({ results: [] });
    }
  ),
  http.delete("*/v1/manage/artistInvites/:artistId", ({ params }) => {
    leftArtistIds.push(String(params.artistId));
    return HttpResponse.json({ message: "Success" });
  }),
];

// Clicks "Yes" in the app's confirmation modal, which opens outside the
// story's canvas.
const confirmDialog = async () => {
  await userEvent.click(
    await within(document.body).findByRole("button", { name: "Yes" })
  );
};

/**
 * The "Team" section of an artist's settings: who else can manage the
 * artist. Only the owner (or an admin) can invite and remove people.
 */
const meta = {
  title: "ManageArtist/ArtistManagers",
  component: ArtistManagers,
  args: { artist: ARTIST_EXAMPLE },
  parameters: {
    layout: "padded",
    msw: { handlers: { managers: handlers() } },
  },
  beforeEach: () => {
    invitedEmails = [];
    removedUserIds = [];
    leftArtistIds = [];
  },
} satisfies Meta<typeof ArtistManagers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The owner sees an accepted manager, a pending invite, and the invite form. */
export const AsOwner: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Sam Manager");
    await expect(canvas.getByText("pending@example.com")).toBeVisible();
    await expect(canvas.getByText("Invite pending")).toBeVisible();
    // The invite form shows once the logged in user has loaded.
    await expect(
      await canvas.findByLabelText("Invite someone by email")
    ).toBeVisible();
  },
};

export const AsOwnerWithNoManagers: Story = {
  parameters: { msw: { handlers: { managers: handlers({ managers: [] }) } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Nobody else manages this artist yet.");
  },
};

export const InviteSent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Invite someone by email"),
      "new@example.com"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Send invite" }));
    await waitFor(() => expect(invitedEmails).toEqual(["new@example.com"]));
    await within(document.body).findByText("Invite sent");
  },
};

/** The API returns 404 when no Mirlo account uses the email. */
export const InviteEmailHasNoAccount: Story = {
  parameters: {
    msw: { handlers: { managers: handlers({ inviteStatus: 404 }) } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Invite someone by email"),
      "nobody@example.com"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Send invite" }));
    await within(document.body).findByText("No Mirlo account uses that email.");
  },
};

export const InviteAlreadySent: Story = {
  parameters: {
    msw: { handlers: { managers: handlers({ inviteStatus: 409 }) } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Invite someone by email"),
      "sam@example.com"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Send invite" }));
    await within(document.body).findByText(
      "That person has already been invited."
    );
  },
};

export const RemoveManager: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Sam Manager");
    const [firstRemove] = canvas.getAllByRole("button", { name: "Remove" });
    await userEvent.click(firstRemove);
    await confirmDialog();
    await waitFor(() =>
      expect(removedUserIds).toEqual([String(ARTIST_MANAGER_EXAMPLE.userId)])
    );
  },
};

/**
 * A manager sees the team read-only, with a button to give up their own
 * access instead of the invite form.
 */
export const AsManager: Story = {
  args: { artist: SHARED_ARTIST_EXAMPLE },
  parameters: {
    msw: {
      handlers: {
        managers: handlers({
          managedArtists: [
            { ...SHARED_ARTIST_EXAMPLE, relationship: "manager" },
          ],
          managers: [CURRENT_USER_AS_MANAGER_EXAMPLE],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "Only the owner of this artist can invite or remove people."
    );
    await expect(
      canvas.queryByLabelText("Invite someone by email")
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Remove" })
    ).not.toBeInTheDocument();

    await userEvent.click(
      await canvas.findByRole("button", { name: "Remove my access" })
    );
    await confirmDialog();
    await waitFor(() =>
      expect(leftArtistIds).toEqual([String(SHARED_ARTIST_EXAMPLE.id)])
    );
  },
};
