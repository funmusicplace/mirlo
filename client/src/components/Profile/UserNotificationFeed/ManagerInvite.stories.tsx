import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import { SHARED_ARTIST_EXAMPLE } from "../../../../test/mocks";

import NotificationFeedItem from "./NotificationFeedItem";

// The app's global `Notification` interface merges with the DOM's, so a
// literal can't satisfy it without the cast.
const NOTIFICATION = {
  id: "manager-invite",
  content: "",
  isRead: false,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  notificationType: "PROFILE_MANAGER_INVITE",
  artist: SHARED_ARTIST_EXAMPLE,
  artistId: SHARED_ARTIST_EXAMPLE.id,
  relatedUser: {
    id: 2,
    name: "Robin Owner",
    email: "robin@example.com",
    artists: [SHARED_ARTIST_EXAMPLE],
    createdAt: "2026-01-01T12:00:00Z",
    updatedAt: "2026-01-01T12:00:00Z",
    currency: "usd",
  },
} as unknown as Notification;

/** The feed item for an invite to help manage someone else's artist. */
const meta = {
  title: "Notifications/ManagerInvite",
  component: NotificationFeedItem,
  args: { notification: NOTIFICATION },
  decorators: [
    (Story) => (
      <ul className="list-none p-0 max-w-[500px]">
        <Story />
      </ul>
    ),
  ],
  parameters: { layout: "padded" },
} satisfies Meta<typeof NotificationFeedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Robin Owner")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "The Borrowed Cabin" })
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Review the invite" })
    ).toHaveAttribute("href", "/manage");
  },
};

/** The smaller version NotificationColumn renders when `compact` is set. */
export const Compact: Story = {
  args: { compact: true },
};
