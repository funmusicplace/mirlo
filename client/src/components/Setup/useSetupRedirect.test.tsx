import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { queryInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { markSetupGuideSeen } from "./guide/setupGuideSeen";
import { useSetupRedirect } from "./useSetupRedirect";

const authState: { user: Partial<LoggedInUser> | null | undefined } = {
  user: undefined,
};
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

const redirectFor = (
  setupStage: InstanceSettings["setupStage"],
  pathname: string
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryInstanceSettings().queryKey, {
    ...DEFAULT_INSTANCE_SETTINGS,
    setupStage,
  });
  const { result } = renderHook(() => useSetupRedirect(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  });
  return result.current;
};

describe("useSetupRedirect", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.user = undefined;
  });

  test("sends every page to the welcome screens while the instance has no name", () => {
    expect(redirectFor("welcome", "/")).toBe("/admin/welcome");
    expect(redirectFor("welcome", "/login")).toBe("/admin/welcome");
    expect(redirectFor("welcome", "/admin/settings")).toBe("/admin/welcome");
  });

  test("lets the password reset through", () => {
    expect(redirectFor("welcome", "/password-reset")).toBeNull();
    expect(redirectFor("welcome", "/password-reset?token=abc")).toBeNull();
  });

  test("sends an admin to the setup guide while the setup is not finished", () => {
    authState.user = { id: 1, isAdmin: true };
    expect(redirectFor("guide", "/")).toBe("/admin/setup");
    expect(redirectFor("guide", "/admin/settings")).toBe("/admin/setup");
    expect(redirectFor("guide", "/admin/setup")).toBeNull();
    expect(redirectFor("guide", "/password-reset")).toBeNull();
  });

  test("leaves listeners and visitors alone during the guide stage", () => {
    expect(redirectFor("guide", "/")).toBeNull();
    authState.user = null;
    expect(redirectFor("guide", "/")).toBeNull();
    authState.user = { id: 2, isAdmin: false };
    expect(redirectFor("guide", "/")).toBeNull();
  });

  test("stops sending the admin to the guide once they chose to finish later", () => {
    authState.user = { id: 1, isAdmin: true };
    markSetupGuideSeen();
    expect(redirectFor("guide", "/")).toBeNull();
  });

  test("does nothing once the setup is done", () => {
    authState.user = { id: 1, isAdmin: true };
    expect(redirectFor("done", "/")).toBeNull();
  });
});
