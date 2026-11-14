import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import React from "react";

import { ARTIST_EXAMPLE, TRACK_EXAMPLE } from "../../../../test/mocks";
import { API_ROOT } from "../../../constants";

import TextEditor from ".";

const COLLABORATOR: Artist = {
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
    artist: COLLABORATOR,
  },
};

const handlers = [
  http.get("*/v1/artists", () =>
    HttpResponse.json({ results: [COLLABORATOR] })
  ),
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

const ComposerWithSavedHtml = (
  props: React.ComponentProps<typeof TextEditor>
) => {
  const [html, setHtml] = React.useState(props.value);
  return (
    <div>
      <TextEditor
        {...props}
        onChange={(value) => {
          setHtml(value);
          props.onChange(value);
        }}
      />
      <pre data-testid="saved-html" className="mt-4 whitespace-pre-wrap">
        {html}
      </pre>
    </div>
  );
};

const findEditor = (canvasElement: HTMLElement) =>
  waitFor(() => {
    const editor = canvasElement.querySelector<HTMLElement>(".ProseMirror");
    if (!editor) throw new Error("Editor not rendered yet");
    return editor;
  });

const meta = {
  title: "Features/Posts/Post composer",
  component: TextEditor,
  render: (args) => <ComposerWithSavedHtml {...args} />,
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

/** A complete authoring flow: credit a collaborator, then embed a track. */
export const TagPeopleAndAddAudio: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await userEvent.click(editor);
    await userEvent.type(editor, "Featuring @lum");
    await userEvent.click(
      await page.findByRole("button", { name: "Lumen Tide" })
    );

    await waitFor(() =>
      expect(editor.querySelector(".mention-link")).toHaveTextContent(
        "Lumen Tide"
      )
    );

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
      expect(
        within(canvasElement).getByTestId("saved-html")
      ).toHaveTextContent(
        `data-mention-handle="@lumen-tide@${new URL(API_ROOT).hostname}"`
      );
    });
  },
};
