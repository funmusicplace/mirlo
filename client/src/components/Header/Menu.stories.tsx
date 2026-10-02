import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import React from "react";

import { managedArtistsHandler } from "../../../.storybook/handlers";
import { ARTIST_EXAMPLE, SHARED_ARTIST_EXAMPLE } from "../../../test/mocks";

import Menu from "./Menu";

// The menu is a <dialog>, so open it once it mounts.
const OpenMenu: React.FC<React.ComponentProps<typeof Menu>> = (props) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    ref.current?.showModal();
  }, []);
  return <Menu {...props} ref={ref} />;
};

const meta = {
  title: "Header/Menu",
  component: OpenMenu,
  args: {
    dialogId: "menu-story",
    isAdmin: false,
    isLabelAccount: false,
    onClose: () => {},
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        menu: managedArtistsHandler([
          { ...ARTIST_EXAMPLE, relationship: "owner" },
          { ...SHARED_ARTIST_EXAMPLE, relationship: "manager" },
        ]),
      },
    },
  },
} satisfies Meta<typeof OpenMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSharedArtist: Story = {
  play: async () => {
    // The dialog is in the top layer, outside the story's canvas element.
    const body = within(document.body);
    const sharedLink = await body.findByRole("link", {
      name: new RegExp(SHARED_ARTIST_EXAMPLE.name),
    });
    await expect(within(sharedLink).getByText("Shared")).toBeVisible();
    const ownedLink = body.getByRole("link", { name: ARTIST_EXAMPLE.name });
    await expect(within(ownedLink).queryByText("Shared")).toBeNull();
  },
};

export const OnlyOwnedArtists: Story = {
  parameters: {
    msw: {
      handlers: {
        menu: managedArtistsHandler([
          { ...ARTIST_EXAMPLE, relationship: "owner" },
        ]),
      },
    },
  },
};
