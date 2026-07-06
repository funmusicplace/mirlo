import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ artistId: "test-artist", trackGroupId: "1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => vi.fn(),
}));

vi.mock("queries", () => ({
  queryArtist: vi.fn(() => ({ queryKey: ["artist"] })),
  queryManagedTrackGroup: vi.fn(() => ({ queryKey: ["trackGroup"] })),
  useDeleteTrackGroupMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("components/ManageArtist/AlbumForm", () => ({ default: () => null }));
vi.mock("components/ManageArtist/BackToArtistLink", () => ({
  default: () => null,
}));
vi.mock("components/ManageArtist/ManageSectionWrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("components/ManageArtist/Merch/DownloadableContent", () => ({
  default: () => null,
}));
vi.mock(
  "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/AlbumPaymentReceiver",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/ManageTrackDefaults",
  () => ({
    default: () => null,
  })
);
vi.mock(
  "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/RecommendedTrackGroups",
  () => ({
    default: () => null,
  })
);
vi.mock("components/ManageArtist/ManageTrackGroup/BulkTrackUpload", () => ({
  default: () => null,
}));
vi.mock("components/ManageArtist/ManageTrackGroup/ManageTrackTable", () => ({
  default: () => null,
}));
vi.mock("components/ManageArtist/ManageTrackGroup/ZipDropZone", () => ({
  ZipDropZone: () => <div data-testid="zip-drop-zone" />,
}));
vi.mock("components/Artist/LoadingBlocks", () => ({ default: () => null }));

import { useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import TrackGroupId from "./Index";

// ---- fixtures ---------------------------------------------------------------

const makeArtist = (overrides: object = {}) => ({
  id: 1,
  urlSlug: "test-artist",
  name: "Test Artist",
  ...overrides,
});

const makeTrackGroup = (overrides: object = {}) => ({
  id: 1,
  title: "Test Album",
  tracks: [],
  fundraiser: null,
  ...overrides,
});

function mockQueries(artist: object, trackGroup: object) {
  vi.mocked(useQuery).mockImplementation((options: any) => {
    const key = options?.queryKey?.[0];
    if (key === "artist") return { data: artist, isPending: false } as any;
    return { data: trackGroup, isPending: false, refetch: vi.fn() } as any;
  });
}

// ---- tests ------------------------------------------------------------------

describe("TrackGroupId", () => {
  describe("when the album has no tracks", () => {
    test("shows the zip drop zone", () => {
      mockQueries(makeArtist(), makeTrackGroup({ tracks: [] }));
      render(
        <MemoryRouter>
          <TrackGroupId />
        </MemoryRouter>
      );
      expect(screen.getByTestId("zip-drop-zone")).toBeInTheDocument();
    });
  });

  describe("when the album already has tracks", () => {
    test("does not show the zip drop zone", () => {
      mockQueries(
        makeArtist(),
        makeTrackGroup({ tracks: [{ id: 10, title: "Track 1" }] })
      );
      render(
        <MemoryRouter>
          <TrackGroupId />
        </MemoryRouter>
      );
      expect(screen.queryByTestId("zip-drop-zone")).not.toBeInTheDocument();
    });
  });
});
