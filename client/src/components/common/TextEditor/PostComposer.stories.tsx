import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { ARTIST_EXAMPLE, TRACK_EXAMPLE } from "../../../../test/mocks";

import TextEditor from ".";

const FEATURED_ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  id: 11,
  name: "Lumen Tide",
  urlSlug: "lumen-tide",
};

const FEATURED_TRACK: Track = {
  ...TRACK_EXAMPLE,
  id: 501,
  title: "Dawn Chorus",
  trackGroup: {
    ...TRACK_EXAMPLE.trackGroup!,
    artist: FEATURED_ARTIST,
  },
};

const handlers = [
  http.get("*/v1/tracks", () =>
    HttpResponse.json({ results: [FEATURED_TRACK] })
  ),
  http.get("*/v1/trackGroups", () => HttpResponse.json({ results: [] })),
  http.get("*/v1/users/:userId/collection", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/users/:userId/wishlist", () =>
    HttpResponse.json({ results: [] })
  ),
];

const findEditor = (canvasElement: HTMLElement) =>
  waitFor(() => {
    const editor = canvasElement.querySelector<HTMLElement>(".ProseMirror");
    if (!editor) throw new Error("Editor not rendered yet");
    return editor;
  });

const meta = {
  title: "Features/Posts/Post composer",
  component: TextEditor,
  args: {
    value: "",
    postId: 1,
    artistId: 1,
    onChange: fn(),
    reloadImages: fn(),
    disableFloatingToolbar: true,
  },
  parameters: {
    msw: { handlers: { postComposer: handlers } },
  },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Add a track to a post from the music picker. */
export const AddAudio: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Add some music" })
    );
    const search = await page.findByRole("searchbox", {
      name: "Add music in this post",
    });
    await userEvent.type(search, "dawn");
    await userEvent.click(
      await page.findByRole("option", {
        name: "Lumen Tide · Dawn Chorus",
      })
    );

    await waitFor(() => {
      expect(
        editor.querySelector('iframe[src="/widget/track/501"]')
      ).toBeInTheDocument();
    });
  },
};
