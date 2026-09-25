vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ARTIST_EXAMPLE,
  DRAFTS_ALBUM_TRACK_EXAMPLE,
  TRACK_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../test/mocks";

import WidgetActionButtons from "./WidgetActionButtons";

// ---- fixtures ---------------------------------------------------------------

const artistWithTiers = {
  ...ARTIST_EXAMPLE,
  subscriptionTiers: [{ id: 1 } as ArtistSubscriptionTier],
};

// ---- tests ------------------------------------------------------------------

describe("WidgetActionButtons", () => {
  it("links Buy to the track page for a track widget", () => {
    render(
      <WidgetActionButtons
        artist={ARTIST_EXAMPLE}
        trackGroup={TRACK_EXAMPLE.trackGroup}
        track={TRACK_EXAMPLE}
      />
    );

    expect(screen.getByRole("link", { name: "buy" })).toHaveAttribute(
      "href",
      "/example-artist/release/example-album/tracks/42?buy=true"
    );
  });

  it("links Buy to the release page for a release widget", () => {
    render(
      <WidgetActionButtons
        artist={ARTIST_EXAMPLE}
        trackGroup={TRACK_GROUP_EXAMPLE}
      />
    );

    expect(screen.getByRole("link", { name: "buy" })).toHaveAttribute(
      "href",
      "/example-artist/release/example-album?buy=true"
    );
  });

  it("only shows Support when the artist has subscription tiers", () => {
    const { rerender } = render(
      <WidgetActionButtons
        artist={ARTIST_EXAMPLE}
        trackGroup={TRACK_GROUP_EXAMPLE}
      />
    );
    expect(
      screen.queryByRole("link", { name: "support" })
    ).not.toBeInTheDocument();

    rerender(
      <WidgetActionButtons
        artist={artistWithTiers}
        trackGroup={TRACK_GROUP_EXAMPLE}
      />
    );
    expect(screen.getByRole("link", { name: "support" })).toHaveAttribute(
      "href",
      "/example-artist/support"
    );
  });

  // #2372: the drafts album has no public release or track page to buy from
  it("hides Buy for a track uploaded to a post", () => {
    render(
      <WidgetActionButtons
        artist={artistWithTiers}
        trackGroup={DRAFTS_ALBUM_TRACK_EXAMPLE.trackGroup}
        track={DRAFTS_ALBUM_TRACK_EXAMPLE}
      />
    );

    expect(screen.queryByRole("link", { name: "buy" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support" })).toBeInTheDocument();
  });
});
