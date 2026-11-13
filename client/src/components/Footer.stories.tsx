import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";

import { SHOWCASE_ARTIST } from "../showcase/shared/fixtures";

import { Footer } from "./Footer";

const footerHandlers = (
  settings: Partial<InstanceSettings>,
  instanceArtistLinks: Link[] | null
) => ({
  instance: http.get("*/v1/instance", () =>
    HttpResponse.json({ result: { ...DEFAULT_INSTANCE_SETTINGS, ...settings } })
  ),
  instanceArtist: http.get("*/v1/settings/instanceArtist", () =>
    HttpResponse.json({
      result: instanceArtistLinks
        ? { ...SHOWCASE_ARTIST, links: [], linksJson: instanceArtistLinks }
        : null,
    })
  ),
});

/**
 * The site footer. The first column belongs to the instance: its name,
 * contact email and the links of its instance artist. The line at the
 * bottom is about Mirlo, the software.
 */
const meta = {
  title: "Features/Instance/Footer",
  component: Footer,
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** mirlo.space: the instance artist carries the project's social links */
export const Mirlo: Story = {
  parameters: {
    msw: {
      handlers: footerHandlers(
        { name: "Mirlo", contactEmail: "hi@mirlo.space" },
        [
          { url: "https://instagram.com/mirlo.space" },
          { url: "https://musician.social/@mirlo", linkType: "Mastodon" },
          { url: "https://bsky.app/profile/mirlo.space" },
        ]
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "Instagram" })
    ).toHaveAttribute("href", "https://instagram.com/mirlo.space");
    await expect(
      canvas.getByRole("link", { name: "Contact us" })
    ).toHaveAttribute("href", "mailto:hi@mirlo.space");
    await expect(
      canvas.getByRole("heading", { name: "Mirlo" })
    ).toBeInTheDocument();
  },
};

/** A self-hosted instance run by a collective, with its own links */
export const Collective: Story = {
  parameters: {
    msw: {
      handlers: footerHandlers(
        { name: "Tidewater Records", contactEmail: "hello@tidewater.coop" },
        [
          { url: "https://tidewater.coop", linkLabel: "About the collective" },
          { url: "https://mastodon.social/@tidewater" },
        ]
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Tidewater Records" })
    ).toBeInTheDocument();
    await expect(
      await canvas.findByRole("link", { name: "About the collective" })
    ).toHaveAttribute("href", "https://tidewater.coop");
    await expect(
      canvas.queryByRole("link", { name: "Instagram" })
    ).not.toBeInTheDocument();
  },
};

/** No contact email and no instance artist: the instance column is hidden */
export const WithoutInstanceLinks: Story = {
  parameters: {
    msw: {
      handlers: footerHandlers(
        { name: "Tidewater Records", contactEmail: null },
        null
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Legal" })
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("heading", { name: "Tidewater Records" })
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Mirlo" })).toHaveAttribute(
      "href",
      "https://docs.mirlo.space"
    );
  },
};
