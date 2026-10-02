import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import ConfirmDeleteModal from "./ConfirmDeleteModal";

const meta = {
  title: "Common/ConfirmDeleteModal",
  component: ConfirmDeleteModal,
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    title: "Delete The Mirlo Band",
    consequences: [
      "All music on this page is deleted immediately. Fans who bought it will no longer be able to download it.",
      "All posts, merch and subscription tiers are deleted.",
      "Everyone subscribed to this page has their subscription cancelled.",
    ],
    confirmText: "The Mirlo Band",
    confirmLabel: "Permanently delete artist page",
  },
} satisfies Meta<typeof ConfirmDeleteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const getDeleteButton = (canvasElement: HTMLElement) =>
  // Modal portals into document.body, outside the story's canvas
  within(canvasElement.ownerDocument.body).getByRole("button", {
    name: /permanently delete artist page/i,
  });

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(getDeleteButton(canvasElement)).toBeDisabled();
  },
};

export const WrongTextStaysDisabled: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(body.getByRole("textbox"), "The Mirlo");

    const button = getDeleteButton(canvasElement);
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const MatchingTextEnablesDelete: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(body.getByRole("textbox"), "The Mirlo Band");

    const button = getDeleteButton(canvasElement);
    await expect(button).toBeEnabled();
    await userEvent.click(button);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

export const Deleting: Story = {
  args: {
    isDeleting: true,
  },
};
