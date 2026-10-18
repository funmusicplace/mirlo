import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAdminSettingsForm } from "./useAdminSettingsForm";

vi.mock("services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    uploadFile: vi.fn(),
    delete: vi.fn(),
  },
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
  queryInstanceArtist: () => ({
    queryKey: ["fetchInstanceArtist"],
    queryFn: () => Promise.resolve(null),
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
    vi.mocked(api.uploadFile).mockReset();
    vi.mocked(api.uploadFile).mockResolvedValue({ result: {} } as any);
    vi.mocked(api.delete).mockReset();
    vi.mocked(api.delete).mockResolvedValue({ result: {} } as any);
  });

  const renderLoadedSettingsForm = async () => {
    const rendered = renderSettingsForm();
    await act(async () => featuredArtistsRequest.resolve(FEATURED_ARTISTS));
    await waitFor(() => expect(rendered.result.current.isLoaded).toBe(true));
    return rendered;
  };

  test("saves the settings first, then uploads a pending logo", async () => {
    const { result } = await renderLoadedSettingsForm();
    const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });

    await act(() =>
      result.current.saveSettings({
        ...result.current.methods.getValues(),
        pendingLogo: file,
      })
    );

    expect(api.uploadFile).toHaveBeenCalledWith("admin/settings/logo/main", [
      file,
    ]);
    expect(vi.mocked(api.post).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(api.uploadFile).mock.invocationCallOrder[0]
    );
    expect(result.current.methods.getValues("pendingLogo")).toBeUndefined();
  });

  test("removes the logo when its removal is pending", async () => {
    const { result } = await renderLoadedSettingsForm();

    await act(() =>
      result.current.saveSettings({
        ...result.current.methods.getValues(),
        pendingLogo: null,
      })
    );

    expect(api.delete).toHaveBeenCalledWith("admin/settings/logo/main");
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  test("keeps the settings saved and the logo pending when the logo is refused", async () => {
    vi.mocked(api.uploadFile).mockRejectedValue(new Error("refused"));
    const { result } = await renderLoadedSettingsForm();
    const file = new File(["x"], "logo.png", { type: "image/png" });

    await expect(
      act(() =>
        result.current.saveSettings({
          ...result.current.methods.getValues(),
          pendingLogo: file,
        })
      )
    ).rejects.toThrow("refused");
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test("uploads no logo when the settings are refused", async () => {
    vi.mocked(api.post).mockRejectedValue(
      new Error("The contact email cannot be removed")
    );
    const { result } = await renderLoadedSettingsForm();

    await expect(
      act(() =>
        result.current.saveSettings({
          ...result.current.methods.getValues(),
          pendingLogo: null,
        })
      )
    ).rejects.toThrow("contact email");
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("uploads a pending mobile logo and removes a dropped one separately", async () => {
    const { result } = await renderLoadedSettingsForm();
    const file = new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" });

    await act(() =>
      result.current.saveSettings({
        ...result.current.methods.getValues(),
        pendingMobileLogo: file,
      })
    );
    await act(() =>
      result.current.saveSettings({
        ...result.current.methods.getValues(),
        pendingMobileLogo: null,
      })
    );

    expect(api.uploadFile).toHaveBeenCalledWith("admin/settings/logo/mobile", [
      file,
    ]);
    expect(api.delete).toHaveBeenCalledWith("admin/settings/logo/mobile");
    expect(api.delete).not.toHaveBeenCalledWith("admin/settings/logo/main");
  });

  test("keeps a logo that was saved before a later step failed out of the next save", async () => {
    vi.mocked(api.uploadFile)
      .mockResolvedValueOnce({ result: {} } as any)
      .mockRejectedValueOnce(new Error("refused"));
    const { result } = await renderLoadedSettingsForm();
    const main = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    const mobile = new File(["x"], "icon.png", { type: "image/png" });

    await expect(
      act(() =>
        result.current.saveSettings({
          ...result.current.methods.getValues(),
          pendingLogo: main,
          pendingMobileLogo: mobile,
        })
      )
    ).rejects.toThrow("refused");

    expect(result.current.methods.getValues("pendingLogo")).toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test("leaves the logo alone when nothing is pending", async () => {
    const { result } = await renderLoadedSettingsForm();

    await act(() =>
      result.current.saveSettings(result.current.methods.getValues())
    );

    expect(api.uploadFile).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
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
