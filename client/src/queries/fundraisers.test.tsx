import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("./fetch/fetchWrapper", () => ({ post }));

import { useCreateFundraiserMutation } from "./fundraisers";
import { queryManagedTrackGroup } from "./users";

describe("useCreateFundraiserMutation", () => {
  it("refreshes the release being edited so its fundraiser shows up", async () => {
    post.mockResolvedValue({ result: { id: 7 } });
    const queryClient = new QueryClient();
    const { queryKey } = queryManagedTrackGroup(4);
    queryClient.setQueryData(queryKey, { id: 4, fundraiser: null } as any);

    const { result } = renderHook(() => useCreateFundraiserMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    await result.current.mutateAsync({ artistId: 10, trackGroupId: 4 });

    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });
});
