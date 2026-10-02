import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { RELEASES } from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";

import FreeDownload from "./FreeDownload";

/** A free EP: nothing to pay, $5 suggested */
const FREE_RELEASE: TrackGroup = {
  ...RELEASES.dusk,
  minPrice: 0,
  suggestedPrice: 500,
};

/**
 * The "email me a download link" form for a release bought for less than $1:
 * a logged-out listener enters an email and gets a download link, no account
 * needed. Note: this component isn't currently rendered anywhere in the app.
 */
const meta = {
  title: "TrackGroup/FreeDownload",
  component: FreeDownload,
  args: { trackGroup: FREE_RELEASE, chosenPrice: "0" },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        auth: authAs(null),
        emailDownload: [
          http.post("*/v1/trackGroups/:id/emailDownload", () =>
            HttpResponse.json({ result: true })
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof FreeDownload>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Logged out, with the email field empty */
export const Default: Story = {};

/** The same form with an email typed in, ready to submit */
export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole("textbox", undefined, {
      timeout: 5000,
    });
    await userEvent.type(input, "jonas.berg@posteo.net");
    await expect(input).toHaveValue("jonas.berg@posteo.net");
  },
};
