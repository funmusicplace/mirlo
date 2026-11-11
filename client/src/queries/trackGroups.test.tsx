import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { put } = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock("./fetch/fetchWrapper", () => ({ put }));

import { useSaveAlbumFormMutation } from "./trackGroups";

const renderSave = () => {
  const queryClient = new QueryClient();
  const { result } = renderHook(() => useSaveAlbumFormMutation(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return result.current.mutateAsync;
};

const fundraiserCalls = () =>
  put.mock.calls.filter(([url]) => url.startsWith("v1/manage/fundraisers/"));

describe("useSaveAlbumFormMutation", () => {
  beforeEach(() => {
    put.mockReset();
    put.mockResolvedValue({ result: {} });
  });

  it("sends only the fundraiser fields that changed, never the release URL", async () => {
    await renderSave()({
      formData: {
        title: "Tidal Hours",
        urlSlug: "tidal-hours",
        fundraiserName: "New van",
        goalAmount: "750",
      },
      trackGroupId: 4,
      artistId: 10,
      fundraiserId: 7,
      dirtyFields: { urlSlug: true, goalAmount: true },
    });

    expect(fundraiserCalls()).toEqual([
      ["v1/manage/fundraisers/7", { goalAmount: 75000 }],
    ]);
  });

  it("doesn't touch the fundraiser when none of its fields changed", async () => {
    await renderSave()({
      formData: { title: "Tidal Hours", urlSlug: "tidal-hours" },
      trackGroupId: 4,
      artistId: 10,
      fundraiserId: 7,
      dirtyFields: { title: true, urlSlug: true },
    });

    expect(fundraiserCalls()).toEqual([]);
    expect(put).toHaveBeenCalledTimes(1);
  });
});
