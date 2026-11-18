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

  describe("the track of a single", () => {
    const singleTrack = (title: string): Track => ({
      ...TRACK_EXAMPLE,
      title,
      trackGroup: {
        ...TRACK_EXAMPLE.trackGroup,
        tracks: [{ ...TRACK_EXAMPLE, title }],
      },
    });

    it("hides the release when the track is named after it", () => {
      const { container } = renderTitle(singleTrack("Example Album"), {
        combineFromAndBy: true,
      });

      expect(screen.queryByText("from")).not.toBeInTheDocument();
      expect(container.textContent).not.toContain("·");
      expect(screen.getByText("by")).toBeInTheDocument();
    });

    it("hides the release in the stacked layout too", () => {
      renderTitle(singleTrack("Example Album"));

      expect(screen.queryByText("from")).not.toBeInTheDocument();
      expect(screen.getByText("by")).toBeInTheDocument();
    });

    it("links the title to the release when the track is named after it", () => {
      renderTitle(singleTrack("Example Album"));

      expect(
        screen.getByRole("link", { name: "Example Album" })
      ).toHaveAttribute(
        "href",
        expect.stringContaining("/example-artist/release/example-album")
      );
    });

    it("keeps the given title link", () => {
      renderTitle(singleTrack("Example Album"), {
        titleLinkTo: "/example-artist/release/example-album/tracks/42",
      });

      expect(
        screen.getByRole("link", { name: "Example Album" })
      ).toHaveAttribute(
        "href",
        "/example-artist/release/example-album/tracks/42"
      );
    });

    it("keeps the release when the track has another title", () => {
      renderTitle(singleTrack("Radio edit"));

      expect(screen.getByText("from")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Example Album" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Radio edit" })
      ).not.toBeInTheDocument();
    });

    it("never links to the drafts album", () => {
      renderTitle({
        ...DRAFTS_ALBUM_TRACK_EXAMPLE,
        title: "",
        trackGroup: {
          ...DRAFTS_ALBUM_TRACK_EXAMPLE.trackGroup,
          tracks: [DRAFTS_ALBUM_TRACK_EXAMPLE],
        },
      });

      for (const link of screen.getAllByRole("link")) {
        expect(link.getAttribute("href")).not.toContain("hidden-draft-album");
      }
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
