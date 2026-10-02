import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { ArtistManager } from "queries";
import { queryClient } from "queries/QueryClientWrapper";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../../../../.storybook/handlers";
import {
  ARTIST_EXAMPLE,
  ARTIST_MANAGER_EXAMPLE,
  CURRENT_USER_AS_MANAGER_EXAMPLE,
  SHARED_ARTIST_EXAMPLE,
} from "../../../../../../test/mocks";

import CustomizeArtistPage from "./Index";

const ARTIST: Artist = { ...ARTIST_EXAMPLE, urlSlug: "example-user" };

let serverArtist: Artist = ARTIST;
let savedArtistBodies: Partial<Artist>[] = [];

// The artist's team, for the Team section.
const teamHandler = (managers: ArtistManager[]) =>
  http.get("*/v1/manage/artists/:artistId/managers", () =>
    HttpResponse.json({ results: managers })
  );

const customizeHandlers = [
  http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
    const body = (await request.json()) as Partial<Artist>;
    savedArtistBodies.push(body);
    serverArtist = { ...serverArtist, ...body };
    return HttpResponse.json({ result: serverArtist });
  }),
  http.get("*/v1/manage/artists/:artistId/labels", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
];

const meta = {
  title: "ManageArtist/Customize",
  component: CustomizeArtistPage,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        // Before `artist`, so `artists/testExistence` isn't caught by its
        // `artists/:artistSlug` handler.
        customize: customizeHandlers,
        artist: artistHandlers(() => serverArtist),
        team: teamHandler([ARTIST_MANAGER_EXAMPLE]),
      },
    },
    reactRouter: reactRouterParameters({
      location: { pathParams: { artistId: String(ARTIST.id) } },
      routing: { path: "/manage/artists/:artistId/customize" },
    }),
  },
  beforeEach: () => {
    serverArtist = ARTIST;
    savedArtistBodies = [];
  },
} satisfies Meta<typeof CustomizeArtistPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slugInput = await canvas.findByLabelText(
      "Text that will appear in the URL"
    );
    await waitFor(() => expect(slugInput).toHaveValue("example-user"));
  },
};

/**
 * #2163: an unsaved slug edit used to snap back to the saved slug whenever the
 * artist refetched, e.g. after the name autosaved or the window regained
 * focus.
 */
export const KeepsUnsavedSlugWhenArtistRefetches: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slugInput = await canvas.findByLabelText(
      "Text that will appear in the URL"
    );
    await waitFor(() => expect(slugInput).toHaveValue("example-user"));
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, "exampleuser");

    // Something else on the page saved, and the artist refetches.
    serverArtist = { ...serverArtist, name: "Renamed elsewhere" };
    await queryClient.invalidateQueries();

    // The refetch reached the form: untouched fields show the new data...
    const nameInput = canvas.getByLabelText("Display name");
    await waitFor(() => expect(nameInput).toHaveValue("Renamed elsewhere"));
    // ...but the slug the user is editing is left alone.
    await expect(slugInput).toHaveValue("exampleuser");

    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(savedArtistBodies).toContainEqual(
        expect.objectContaining({ urlSlug: "exampleuser" })
      )
    );
  },
};

export const AsOwner: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { name: "Team" });
    await expect(
      await canvas.findByLabelText("Invite someone by email")
    ).toBeVisible();
    await expect(canvas.getByText("Artist page termination")).toBeVisible();
  },
};

export const AsManager: Story = {
  beforeEach: () => {
    serverArtist = { ...SHARED_ARTIST_EXAMPLE, id: ARTIST.id };
  },
  parameters: {
    msw: {
      handlers: {
        artist: artistHandlers(() => serverArtist, {
          relationship: "manager",
        }),
        team: teamHandler([CURRENT_USER_AS_MANAGER_EXAMPLE]),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Remove my access" });
    await expect(
      canvas.queryByLabelText("Invite someone by email")
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Artist page termination")
    ).not.toBeInTheDocument();
    await expect(canvas.getByLabelText("Display name")).toBeVisible();
  },
};
