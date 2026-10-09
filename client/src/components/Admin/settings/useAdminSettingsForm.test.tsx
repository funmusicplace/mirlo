import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAdminSettingsForm } from "./useAdminSettingsForm";

vi.mock("services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const { featuredArtistsRequest } = vi.hoisted(() => ({
  featuredArtistsRequest: { resolve: (_artists: Artist[]) => {} },
}));

vi.mock("queries/settings", () => ({
  queryFeaturedArtists: () => ({
    queryKey: ["fetchFeaturedArtists"],
    queryFn: () =>
      new Promise<Artist[]>((resolve) => {
        featuredArtistsRequest.resolve = resolve;
      }),
  }),
}));

const STORED_SETTINGS = {
  result: {
    cdnUrl: "https://cdn.example.com",
    settings: { platformPercent: 7 },
  },
};

const FEATURED_ARTISTS = [{ id: 4, name: "Nightjar" }] as Artist[];

const renderSettingsForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useAdminSettingsForm(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("useAdminSettingsForm", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue(STORED_SETTINGS as any);
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockImplementation(async (_endpoint, body) => ({
      result: body,
    }));
  });

  test("is not loaded until the featured artists are known, then saves them", async () => {
    const { result } = renderSettingsForm();

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("admin/settings/")
    );
    expect(result.current.isLoaded).toBe(false);

    await act(async () => featuredArtistsRequest.resolve(FEATURED_ARTISTS));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.methods.getValues("cdnUrl")).toBe(
      "https://cdn.example.com"
    );

    await act(() =>
      result.current.saveSettings(result.current.methods.getValues())
    );

    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
      settings: { featuredArtistIds: [4] },
    });
  });

  test("takes the settings returned by the save as the new reference values", async () => {
    vi.mocked(api.post).mockResolvedValue({
      result: {
        cdnUrl: "https://cdn.nightjar.test",
        settings: {
          platformPercent: 7,
          stripe: { keyConfigured: true },
        },
      },
    } as any);
    const { result } = renderSettingsForm();
    await act(async () => featuredArtistsRequest.resolve(FEATURED_ARTISTS));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(() =>
      result.current.saveSettings({
        ...result.current.methods.getValues(),
        cdnUrl: "https://cdn.typed.test",
        stripe: { key: "sk_test_typed" },
      })
    );

    const { defaultValues } = result.current.methods.formState;
    expect(defaultValues?.cdnUrl).toBe("https://cdn.nightjar.test");
    expect(result.current.methods.getValues("stripe.key")).toBe("");
    expect(result.current.methods.getValues("stripe.keyConfigured")).toBe(true);
  });

  test("reports a load error when the settings cannot be fetched", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    const { result } = renderSettingsForm();

    await waitFor(() => expect(result.current.hasLoadError).toBe(true));
    expect(result.current.isLoaded).toBe(false);
  });
});
