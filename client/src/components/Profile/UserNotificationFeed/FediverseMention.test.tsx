import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import { removeNotification } from "queries/notifications";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const snackbarMock = vi.fn();
const errorHandlerMock = vi.fn();

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 1 } }),
}));

vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => snackbarMock,
}));

vi.mock("services/useErrorHandler", () => ({
  default: () => errorHandlerMock,
}));

vi.mock("queries/notifications", () => ({
  removeNotification: vi.fn(),
}));

import FediverseMention from "./FediverseMention";

const buildNotification = (
  ap: NonNullable<Notification["metadata"]>["ap"]
): Notification =>
  ({
    id: "notification-1",
    notificationType: "AP_MENTION",
    isRead: false,
    createdAt: new Date().toISOString(),
    content: "@artist hello",
    metadata: { ap },
    artist: { id: 1, name: "Artist Name", urlSlug: "artist-name" },
  }) as unknown as Notification;

const renderMention = (
  notification: Notification,
  onRemoved: () => void = vi.fn()
) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FediverseMention notification={notification} onRemoved={onRemoved} />
      </MemoryRouter>
    </QueryClientProvider>
  );

const actor = "https://mastodon.example/users/someone";

describe("FediverseMention", () => {
  beforeEach(() => {
    snackbarMock.mockClear();
    errorHandlerMock.mockClear();
    vi.mocked(removeNotification).mockReset();
  });

  describe("renders remote display names as plain text", () => {
    const instanceName = i18n.options.interpolation?.defaultVariables
      ?.instanceName as string;

    test.each([
      "Alice",
      "<b>x</b>",
      "<0>zero</0>",
      '</author><author style="">',
      "</author><script>alert(1)</script>",
      "{{instanceName}}",
      "{{defaultValue}}",
      "{{actorName}}",
      "$t(notifications.mentionRemoved)",
      "Tom &amp; &lt;i&gt;",
      "\u202Eevil\u202C",
      "a".repeat(200),
    ])("%s", (actorName) => {
      const { container } = renderMention(
        buildNotification({ actor, actorName })
      );

      const bdi = container.querySelector("strong > bdi");
      expect(bdi?.textContent).toBe(actorName);
      expect(container.textContent).toContain("mentioned you on the fediverse");
      expect(bdi?.textContent).not.toContain("Artist Name");
      if (actorName.includes("instanceName")) {
        expect(bdi?.textContent).not.toBe(instanceName);
      }
    });
  });

  test("falls back to the handle, then the actor host", () => {
    const { container, unmount } = renderMention(
      buildNotification({ actor, actorHandle: "@someone@mastodon.example" })
    );
    expect(container.querySelector("strong > bdi")?.textContent).toBe(
      "@someone@mastodon.example"
    );
    unmount();

    const { container: bare } = renderMention(buildNotification({ actor }));
    expect(bare.querySelector("strong > bdi")?.textContent).toBe(
      "mastodon.example"
    );
    expect(bare.textContent).not.toContain(actor);
  });

  test("shows the actor host under the name when the handle was dropped", () => {
    renderMention(buildNotification({ actor, actorName: "Mirlo Support" }));

    expect(screen.getByText("mastodon.example")).toBeInTheDocument();
  });

  test("shows the username and host under the name", () => {
    const { container } = renderMention(
      buildNotification({
        actor,
        actorName: "Alice",
        actorHandle: "@someone@mastodon.example",
      })
    );

    expect(container.textContent).toContain("@someone@mastodon.example");
    expect(screen.getByText("@mastodon.example")).toBeInTheDocument();
  });

  test("removes the mention and calls onRemoved", async () => {
    vi.mocked(removeNotification).mockResolvedValue(undefined as never);
    const onRemoved = vi.fn();
    renderMention(buildNotification({ actor, actorName: "Alice" }), onRemoved);

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(snackbarMock).toHaveBeenCalledWith("Mention removed.", {
      type: "success",
    });
    expect(errorHandlerMock).not.toHaveBeenCalled();
  });

  test("treats a mention that is already gone as removed", async () => {
    vi.mocked(removeNotification).mockRejectedValue(
      new MirloFetchError(new Response(null, { status: 404 }))
    );
    const onRemoved = vi.fn();
    renderMention(buildNotification({ actor, actorName: "Alice" }), onRemoved);

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(snackbarMock).toHaveBeenCalledWith("Mention removed.", {
      type: "success",
    });
    expect(errorHandlerMock).not.toHaveBeenCalled();
  });

  test.each([400, 401, 500])(
    "reports a %s error and keeps focus on the button",
    async (status) => {
      vi.mocked(removeNotification).mockRejectedValue(
        new MirloFetchError(new Response(null, { status }))
      );
      const onRemoved = vi.fn();
      renderMention(
        buildNotification({ actor, actorName: "Alice" }),
        onRemoved
      );

      const button = screen.getByRole("button", { name: "Remove" });
      await userEvent.click(button);

      await waitFor(() => expect(errorHandlerMock).toHaveBeenCalledTimes(1));
      expect(onRemoved).not.toHaveBeenCalled();
      expect(snackbarMock).not.toHaveBeenCalled();
      expect(button).not.toBeDisabled();
      expect(button).toHaveFocus();
    }
  );

  test("sends a single request on a double click", async () => {
    let resolve: () => void = () => {};
    vi.mocked(removeNotification).mockReturnValue(
      new Promise((r) => {
        resolve = () => r(undefined as never);
      })
    );
    renderMention(buildNotification({ actor, actorName: "Alice" }));

    const button = screen.getByRole("button", { name: "Remove" });
    await userEvent.dblClick(button);
    resolve();

    await waitFor(() => expect(snackbarMock).toHaveBeenCalled());
    expect(removeNotification).toHaveBeenCalledTimes(1);
  });
});
