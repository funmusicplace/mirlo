import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { queryInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SetupBanner from "./SetupBanner";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const authState: { user: Partial<LoggedInUser> | null | undefined } = {
  user: undefined,
};
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

const renderBanner = (
  setupStage: InstanceSettings["setupStage"],
  pathname = "/"
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryInstanceSettings().queryKey, {
    ...DEFAULT_INSTANCE_SETTINGS,
    setupStage,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <SetupBanner />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("SetupBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState.user = { id: 1, isAdmin: true };
  });

  test("shows an admin that the setup is not finished", () => {
    renderBanner("guide");

    expect(screen.getByRole("status")).toHaveTextContent("title");
    expect(screen.getByRole("link", { name: "resume" })).toHaveAttribute(
      "href",
      "/admin/setup"
    );
  });

  test("stays hidden for listeners and once the setup is done", () => {
    authState.user = { id: 2, isAdmin: false };
    const { unmount } = renderBanner("guide");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    unmount();

    authState.user = { id: 1, isAdmin: true };
    renderBanner("done");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("stays hidden on the guide itself", () => {
    renderBanner("guide", "/admin/setup");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("can be hidden for the rest of the session", async () => {
    const { unmount } = renderBanner("guide");

    await userEvent.click(screen.getByRole("button", { name: "dismiss" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    unmount();

    renderBanner("guide");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
