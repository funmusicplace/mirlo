import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { queryInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";
import { describe, expect, test } from "vitest";

import { useSetupRedirect } from "./useSetupRedirect";

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
  test("sends every page to the welcome screens while the instance has no name", () => {
    expect(redirectFor("welcome", "/")).toBe("/admin/welcome");
    expect(redirectFor("welcome", "/login")).toBe("/admin/welcome");
    expect(redirectFor("welcome", "/admin/settings")).toBe("/admin/welcome");
  });

  test("lets the password reset through", () => {
    expect(redirectFor("welcome", "/password-reset")).toBeNull();
    expect(redirectFor("welcome", "/password-reset?token=abc")).toBeNull();
  });

  test("does nothing once the instance has a name", () => {
    expect(redirectFor("guide", "/")).toBeNull();
    expect(redirectFor("done", "/")).toBeNull();
  });
});
