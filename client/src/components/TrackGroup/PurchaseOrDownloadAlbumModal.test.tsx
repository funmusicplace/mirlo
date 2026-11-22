import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { TRACK_GROUP_EXAMPLE } from "../../../test/mocks";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { id: 1, urlSlug: "example-artist" } }),
}));
vi.mock("queries", () => ({ queryArtist: vi.fn() }));
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
}));
vi.mock("components/TrackGroup/BuyTrackGroup", () => ({
  default: () => null,
}));

import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";

const trackGroup = {
  ...TRACK_GROUP_EXAMPLE,
  publishedAt: "2020-01-01T00:00:00Z",
};

describe("PurchaseOrDownloadAlbum", () => {
  test("a buy link opens only the button that opts in", () => {
    render(
      <MemoryRouter
        initialEntries={["/example-artist/release/example-album?buy=true"]}
      >
        <PurchaseOrDownloadAlbum trackGroup={trackGroup} openFromLink />
        <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
      </MemoryRouter>
    );

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});
