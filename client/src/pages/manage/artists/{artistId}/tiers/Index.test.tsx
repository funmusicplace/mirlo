import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const tiersState: { results: any[] } = { results: [] };
const invalidateQueries = vi.fn();

vi.mock("queries", () => ({
  queryManagedArtist: (artistId: number) => ({
    queryKey: ["managedArtist", artistId],
  }),
  queryManagedArtistSubscriptionTiers: ({
    artistId,
  }: {
    artistId: number;
  }) => ({
    queryKey: ["managedArtistTiers", artistId],
  }),
  useCreateSubscriptionTierMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateArtistMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (opts: { queryKey: [string, ...unknown[]] }) => {
      if (opts.queryKey[0] === "managedArtist") {
        return {
          data: {
            id: 10,
            userId: 99,
            name: "Test Artist",
            properties: {},
          },
        };
      }
      return { data: tiersState };
    },
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ artistId: "10" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 99 } }),
}));

vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => vi.fn(),
}));

vi.mock("services/useErrorHandler", () => ({
  default: () => vi.fn(),
}));

const apiPut = vi.fn();
vi.mock("services/api", () => ({
  default: {
    put: (...args: unknown[]) => apiPut(...args),
  },
}));

let capturedPersistOrder: ((ids: number[]) => Promise<void>) | undefined;
vi.mock("utils/useSortableReorder", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("utils/useSortableReorder")>();
  return {
    default: (
      items: { id: number }[] | undefined,
      persistOrder: (ids: number[]) => Promise<void>
    ) => {
      capturedPersistOrder = persistOrder;
      return actual.default(items, persistOrder);
    },
  };
});

vi.mock("components/ManageArtist/ManageSubscriptionTierBox", () => ({
  default: ({ tier }: any) => <div data-testid="tier-box">{tier.name}</div>,
}));

import Index from "./Index";

describe("Manage Tiers Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPersistOrder = undefined;
    tiersState.results = [
      { id: 2, name: "Gold ($15)", minAmount: 1500, order: 1 },
      { id: 1, name: "Bronze ($5)", minAmount: 500, order: 2 },
    ];
  });

  test("renders tiers in the order returned by the API without re-sorting by minAmount", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    const boxes = screen.getAllByTestId("tier-box");
    expect(boxes.map((b) => b.textContent)).toEqual([
      "Gold ($15)",
      "Bronze ($5)",
    ]);
  });

  test("persists new tier order via PUT subscriptionTierOrder and invalidates query cache", async () => {
    apiPut.mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    expect(capturedPersistOrder).toBeDefined();
    await capturedPersistOrder!([1, 2]);

    expect(apiPut).toHaveBeenCalledWith(
      "manage/artists/10/subscriptionTierOrder",
      { tierIds: [1, 2] }
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["managedArtistTiers", 10],
    });
  });
});
