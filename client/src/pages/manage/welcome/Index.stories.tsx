import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { ARTIST_EXAMPLE } from "../../../../test/mocks";

import WelcomePage from "./Index";

// Bodies of every artist update the page sends, so play functions can check
// what was saved.
let savedArtistBodies: Partial<Artist>[] = [];

const welcomeHandlers = [
  // Creating the artist: the server derives the slug from the name.
  http.post("*/v1/manage/artists", async ({ request }) => {
    const { name } = (await request.json()) as { name: string };
    return HttpResponse.json({
      result: {
        ...ARTIST_EXAMPLE,
        name,
        urlSlug: name.toLowerCase().replace(/\s+/g, "-"),
      },
    });
  }),
  http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
    const body = (await request.json()) as Partial<Artist>;
    savedArtistBodies.push(body);
    return HttpResponse.json({ result: { ...ARTIST_EXAMPLE, ...body } });
  }),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
];

/**
 * The new-artist onboarding at /manage/welcome: pick a name (which creates the
 * artist), then choose the URL slug before customizing or viewing the page.
 */
const meta = {
  title: "ManageArtist/Welcome",
  component: WelcomePage,
  parameters: {
    layout: "padded",
    msw: { handlers: { welcome: welcomeHandlers } },
    reactRouter: reactRouterParameters({
      routing: { path: "/manage/welcome" },
    }),
  },
  beforeEach: () => {
    savedArtistBodies = [];
  },
} satisfies Meta<typeof WelcomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NameStep: Story = {};

// Gets through the name step, then replaces the suggested "foo-bar" slug with
// "foobar", the edit the user in #2163 kept losing.
const createArtistAndEditSlug = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.type(
    await canvas.findByLabelText("First, what's your public artist name?"),
    "Foo Bar"
  );
  await userEvent.click(canvas.getByRole("checkbox"));
  await userEvent.click(canvas.getByRole("button", { name: "Next" }));

  const slugInput = await canvas.findByLabelText(
    "What should the artist page's URL be?"
  );
  await waitFor(() => expect(slugInput).toHaveValue("foo-bar"));
  await userEvent.clear(slugInput);
  await userEvent.type(slugInput, "foobar");
  return canvas;
};

export const UrlSlugStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await createArtistAndEditSlug(canvasElement);
    await expect(
      canvas.getByText(`${window.location.host}/foobar`)
    ).toBeInTheDocument();
  },
};

export const SavesEditedSlugBeforeCustomizing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await createArtistAndEditSlug(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Customize what the artist page will look like.",
      })
    );
    await waitFor(() =>
      expect(savedArtistBodies).toEqual([
        { name: "Foo Bar", urlSlug: "foobar" },
      ])
    );
  },
};

export const SavesEditedSlugBeforeSkipping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await createArtistAndEditSlug(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Skip this! Take me to the new artist page.",
      })
    );
    await waitFor(() =>
      expect(savedArtistBodies).toEqual([
        { name: "Foo Bar", urlSlug: "foobar" },
      ])
    );
  },
};
