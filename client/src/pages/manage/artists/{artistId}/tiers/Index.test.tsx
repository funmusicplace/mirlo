import { fireEvent, render, screen } from "@testing-library/react";
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
const fundraisersState: { results: any[] } = { results: [] };
const invalidateQueries = vi.fn();
const { createFundraiser, navigate } = vi.hoisted(() => ({
  createFundraiser: vi.fn(),
  navigate: vi.fn(),
}));

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
  queryManagedArtistFundraisers: (artistId: number) => ({
    queryKey: ["managedArtistFundraisers", artistId],
  }),
  useCreateFundraiserMutation: () => ({
    mutate: createFundraiser,
    isPending: false,
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
      if (opts.queryKey[0] === "managedArtistFundraisers") {
        return { data: fundraisersState };
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
    useNavigate: () => navigate,
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

vi.mock("components/ManageArtist/Fundraisers/ManageFundraisersList", () => ({
  default: ({ fundraisers }: any) => (
    <ul data-testid="fundraisers">
      {fundraisers.map((f: any) => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  ),
}));

vi.mock("components/ManageArtist/ManageSubscriptionTierBox", () => ({
  default: ({ tier }: any) => <div data-testid="tier-box">{tier.name}</div>,
}));

vi.mock(
  "components/ManageArtist/ManageArtistDetails/SubscriptionPayoutsWarning",
  () => ({
    default: () => null,
  })
);

import Index from "./Index";

describe("Manage Tiers Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPersistOrder = undefined;
    fundraisersState.results = [];
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

  test("lists the artist's fundraisers above the tiers", () => {
    fundraisersState.results = [{ id: 5, name: "New van" }];
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    const fundraisers = screen.getByTestId("fundraisers");
    expect(fundraisers).toHaveTextContent("New van");
    expect(
      fundraisers.compareDocumentPosition(screen.getAllByTestId("tier-box")[0])
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("creates an untitled fundraiser and opens it for editing", () => {
    createFundraiser.mockImplementation((_vars, { onSuccess }) =>
      onSuccess({ result: { id: 12 } })
    );
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "addFundraiser" }));

    expect(createFundraiser).toHaveBeenCalledWith(
      { artistId: 10, name: "untitledFundraiser" },
      expect.anything()
    );
    expect(navigate).toHaveBeenCalledWith("/manage/artists/10/fundraisers/12");
  });
});
