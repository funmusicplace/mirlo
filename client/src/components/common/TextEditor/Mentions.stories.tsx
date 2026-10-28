import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import React from "react";

import { ARTIST_EXAMPLE } from "../../../../test/mocks/artist";
import { API_ROOT } from "../../../constants";
import { typeLikeAPerson } from "../../../showcase/shared/helpers";

import TextEditor from ".";

const AP_DOMAIN = new URL(API_ROOT).hostname;

const ARTISTS: Artist[] = [
  { ...ARTIST_EXAMPLE, id: 11, name: "Lumen Tide", urlSlug: "lumen-tide" },
  { ...ARTIST_EXAMPLE, id: 12, name: "Lumen Choir", urlSlug: "lumen-choir" },
  { ...ARTIST_EXAMPLE, id: 13, name: "Harbour Lights", urlSlug: "harbour" },
];

const REMOTE_ACTOR = {
  id: "https://harbour.social/users/marta",
  name: "Marta Reis",
  preferredUsername: "marta",
  url: "https://harbour.social/@marta",
};

const mentionHandlers = [
  http.get("*/v1/artists", async ({ request }) => {
    const name = new URL(request.url).searchParams.get("name") ?? "";
    await delay(300);
    return HttpResponse.json({
      results: ARTISTS.filter((a) =>
        a.name.toLowerCase().includes(name.toLowerCase())
      ),
    });
  }),
  http.get("*/v1/activityPub/webfinger", async ({ request }) => {
    const resource = new URL(request.url).searchParams.get("resource");
    await delay(500);
    if (resource === "acct:marta@harbour.social") {
      return HttpResponse.json({ result: REMOTE_ACTOR });
    }
    return new HttpResponse(null, { status: 404 });
  }),
];

const EditorWithSavedHtml = (
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
      <pre
        data-testid="saved-html"
        className="mt-4 whitespace-pre-wrap break-all text-xs"
      >
        {html}
      </pre>
    </div>
  );
};

const findEditor = (canvasElement: HTMLElement) =>
  waitFor(() => {
    const el = canvasElement.querySelector<HTMLElement>(".ProseMirror");
    if (!el) throw new Error("Editor not rendered yet");
    return el;
  });

const savedHtml = (canvasElement: HTMLElement) =>
  within(canvasElement).getByTestId("saved-html").textContent ?? "";

const meta = {
  title: "Features/Posts/Mentions",
  component: TextEditor,
  render: (args) => <EditorWithSavedHtml {...args} />,
  args: {
    value: "",
    postId: 1,
    artistId: 1,
    onChange: fn(),
    reloadImages: fn(),
    disableFloatingToolbar: true,
  },
  parameters: {
    msw: { handlers: { mentions: mentionHandlers } },
  },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TagMirloArtist: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await typeLikeAPerson(editor, "Recorded with @lum");
    await page.findByRole("button", { name: "Lumen Choir" });
    await userEvent.click(
      await page.findByRole("button", { name: "Lumen Tide" })
    );

    const link = await waitFor(() => {
      const el = editor.querySelector(".mention-link");
      if (!el) throw new Error("Mention not inserted yet");
      return el;
    });
    await expect(link).toHaveTextContent("Lumen Tide");
    await waitFor(() =>
      expect(savedHtml(canvasElement)).toContain(
        `data-mention-handle="@lumen-tide@${AP_DOMAIN}"`
      )
    );
  },
};

export const TagWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await typeLikeAPerson(editor, "Thanks @lumen");
    await page.findByRole("button", { name: "Lumen Choir" });
    await userEvent.keyboard("{ArrowDown}{Enter}");

    await waitFor(() =>
      expect(savedHtml(canvasElement)).toContain(
        `data-mention-handle="@lumen-choir@${AP_DOMAIN}"`
      )
    );
  },
};

export const TagFediverseUser: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await typeLikeAPerson(editor, "Mixed by @marta@harbour.social");
    await userEvent.click(
      await page.findByRole("button", {
        name: "Marta Reis (@marta@harbour.social)",
      })
    );

    await waitFor(() => {
      const html = savedHtml(canvasElement);
      expect(html).toContain(`data-mention-actor="${REMOTE_ACTOR.id}"`);
      expect(html).toContain(`href="${REMOTE_ACTOR.url}"`);
    });
  },
};

export const NoMatches: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await typeLikeAPerson(editor, "Hello @nobody");
    await expect(await page.findByText("No users found")).toBeVisible();
  },
};

export const DismissWithEscape: Story = {
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await typeLikeAPerson(editor, "Email me @lum");
    await page.findByRole("button", { name: "Lumen Tide" });
    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        page.queryByRole("button", { name: "Lumen Tide" })
      ).not.toBeInTheDocument()
    );
    await expect(savedHtml(canvasElement)).not.toContain("data-mention");
  },
};

export const ExistingMentions: Story = {
  args: {
    value: `<p>New record with <a href="/lumen-tide" data-mention-actor="${API_ROOT}/v1/ap/artists/lumen-tide" data-mention-handle="@lumen-tide@${AP_DOMAIN}">Lumen Tide</a>, mixed by <a href="${REMOTE_ACTOR.url}" data-mention-actor="${REMOTE_ACTOR.id}" data-mention-handle="@marta@harbour.social">Marta Reis</a>.</p>`,
  },
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    await waitFor(() =>
      expect(editor.querySelectorAll(".mention-link")).toHaveLength(2)
    );
  },
};
