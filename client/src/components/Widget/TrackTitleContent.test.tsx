vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

// Pulled in through ./utils; it wraps hls.js, which the title never renders
vi.mock("components/Player/AudioWrapper", () => ({
  AudioWrapper: () => null,
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DRAFTS_ALBUM_TRACK_EXAMPLE, TRACK_EXAMPLE } from "../../../test/mocks";

import TrackTitleContent from "./TrackTitleContent";

// ---- helpers ----------------------------------------------------------------

const renderTitle = (
  track: Track,
  props: Partial<React.ComponentProps<typeof TrackTitleContent>> = {}
) =>
  render(
    <MemoryRouter>
      <TrackTitleContent track={track} embeddedInMirlo={false} {...props} />
    </MemoryRouter>
  );

// ---- tests ------------------------------------------------------------------

describe("TrackTitleContent", () => {
  describe("a track on a release", () => {
    it("links to the release it's from", () => {
      renderTitle(TRACK_EXAMPLE);

      expect(screen.getByText("from")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Example Album" })
      ).toHaveAttribute(
        "href",
        expect.stringContaining("/example-artist/release/example-album")
      );
    });

    it("falls back to 'untitled' when the release has no title", () => {
      renderTitle({
        ...TRACK_EXAMPLE,
        trackGroup: { ...TRACK_EXAMPLE.trackGroup, title: "" },
      });

      expect(
        screen.getByRole("link", { name: "untitled" })
      ).toBeInTheDocument();
    });

    it("links to the release inside the app when used by the player", () => {
      renderTitle(TRACK_EXAMPLE, {
        useTrackArtistLinks: true,
        combineFromAndBy: true,
      });

      expect(
        screen.getByRole("link", { name: "Example Album" })
      ).toHaveAttribute("href", "/example-artist/release/example-album");
      expect(screen.getByText("·", { exact: false })).toBeInTheDocument();
    });
  });

  // #2372: post uploads live in a hidden drafts album with no public page
  describe("a track uploaded to a post", () => {
    it("doesn't link to the hidden drafts album", () => {
      renderTitle(DRAFTS_ALBUM_TRACK_EXAMPLE);

      expect(screen.queryByText("from")).not.toBeInTheDocument();
      expect(screen.queryByText("untitled")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /hidden-draft-album/ })
      ).not.toBeInTheDocument();
      for (const link of screen.getAllByRole("link")) {
        expect(link.getAttribute("href")).not.toContain("hidden-draft-album");
      }
    });

    it("still credits the artist", () => {
      renderTitle(DRAFTS_ALBUM_TRACK_EXAMPLE);

      expect(screen.getByText("by")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Example Artist" })
      ).toBeInTheDocument();
    });

    it("drops the separator when the by-line is combined", () => {
      const { container } = renderTitle(DRAFTS_ALBUM_TRACK_EXAMPLE, {
        combineFromAndBy: true,
        useTrackArtistLinks: true,
      });

      expect(container.textContent).not.toContain("·");
      expect(screen.getByText("by")).toBeInTheDocument();
    });
  });
});
