import assert from "assert";

import { describe, it } from "mocha";

import {
  joinArtistNames,
  releaseArtistText,
  resolveReleaseArtists,
  resolveTrackArtists,
  trackArtistText,
  trackArtistTextForRelease,
} from "../../src/utils/releaseArtists";

const owner = { id: 7, name: "Rob", urlSlug: "rob" };

const row = (
  artistName: string,
  order: number,
  linked?: { profileId: number; urlSlug: string }
) => ({
  artistName,
  order,
  profileId: linked?.profileId ?? null,
  profile: linked ? { urlSlug: linked.urlSlug } : null,
});

const trackArtist = (
  artistName: string | null,
  appearsAs: "MAIN" | "FEATURED" | "CREDITS_ONLY",
  order: number,
  extra?: { artistId?: number; role?: string }
) => ({
  artistName,
  appearsAs,
  order,
  artistId: extra?.artistId ?? null,
  role: extra?.role ?? null,
});

describe("utils/releaseArtists", () => {
  describe("resolveReleaseArtists", () => {
    it("falls back to the owner profile when nothing is credited", () => {
      assert.deepEqual(resolveReleaseArtists([], owner), {
        releaseArtistsSource: "owner",
        releaseArtists: [{ name: "Rob", urlSlug: "rob", artistId: 7 }],
      });
    });

    it("returns nothing when there is neither a credit nor an owner name", () => {
      assert.deepEqual(resolveReleaseArtists([], null).releaseArtists, []);
      assert.deepEqual(
        resolveReleaseArtists([], { name: "  " }).releaseArtists,
        []
      );
    });

    it("lists the credited names in order, trimmed", () => {
      const resolved = resolveReleaseArtists(
        [row("Alice", 2), row(" Mirb ", 1)],
        owner
      );
      assert.equal(resolved.releaseArtistsSource, "credited");
      assert.deepEqual(
        resolved.releaseArtists.map((link) => link.name),
        ["Mirb", "Alice"]
      );
    });

    it("links a linked credit to its profile and a free name to the owner", () => {
      const { releaseArtists } = resolveReleaseArtists(
        [
          row("Mirb", 0, { profileId: 3, urlSlug: "mirb" }),
          row("Moon Band", 1),
        ],
        owner
      );
      assert.deepEqual(releaseArtists, [
        { name: "Mirb", urlSlug: "mirb", artistId: 3 },
        { name: "Moon Band", urlSlug: "rob", artistId: undefined },
      ]);
    });
  });

  describe("resolveTrackArtists", () => {
    const releaseArtists = [{ name: "Rob", urlSlug: "rob" }];

    it("uses the release artists when the track has no main artist, and says so", () => {
      const resolved = resolveTrackArtists(
        [trackArtist("Sam", "CREDITS_ONLY", 0)],
        releaseArtists
      );
      assert.equal(resolved.mainArtistsSource, "release");
      assert.deepEqual(resolved.mainArtists, releaseArtists);
      assert.deepEqual(resolved.featuredArtists, []);
    });

    it("puts the track's own main artists first, in order, with their id and role", () => {
      const resolved = resolveTrackArtists(
        [
          trackArtist("Moon Band", "MAIN", 1),
          trackArtist("Mirb", "MAIN", 0, { artistId: 3, role: "Vocals" }),
        ],
        releaseArtists
      );
      assert.equal(resolved.mainArtistsSource, "track");
      assert.deepEqual(resolved.mainArtists, [
        { name: "Mirb", artistId: 3, role: "Vocals" },
        { name: "Moon Band", artistId: undefined, role: undefined },
      ]);
    });

    it("treats main artists without a name as no main artist", () => {
      const resolved = resolveTrackArtists(
        [trackArtist(null, "MAIN", 0), trackArtist("  ", "MAIN", 1)],
        releaseArtists
      );
      assert.equal(resolved.mainArtistsSource, "release");
      assert.deepEqual(resolved.mainArtists, releaseArtists);
    });

    it("drops a featured artist whose name equals a main artist, the release artist included", () => {
      assert.deepEqual(
        resolveTrackArtists(
          [
            trackArtist("rob ", "FEATURED", 0),
            trackArtist("Alice", "FEATURED", 1),
          ],
          releaseArtists
        ).featuredArtists.map((link) => link.name),
        ["Alice"]
      );
      assert.deepEqual(
        resolveTrackArtists(
          [trackArtist("Mirb", "MAIN", 0), trackArtist("MIRB", "FEATURED", 1)],
          releaseArtists
        ).featuredArtists,
        []
      );
    });
  });

  describe("text", () => {
    it("joins names with commas and a final ampersand", () => {
      assert.equal(joinArtistNames([]), "");
      assert.equal(joinArtistNames([{ name: "A" }]), "A");
      assert.equal(
        joinArtistNames([{ name: "A" }, { name: "B" }, { name: "C" }]),
        "A, B & C"
      );
    });

    it('adds featured artists with "with"', () => {
      assert.equal(
        trackArtistText({
          mainArtists: [{ name: "Rob" }],
          featuredArtists: [{ name: "Alice" }, { name: "Bea" }],
        }),
        "Rob with Alice & Bea"
      );
    });

    it("builds the release and track lines from the stored rows", () => {
      const rows = [row("Alice", 1), row("Mirb", 0)];
      assert.equal(releaseArtistText(rows, owner), "Mirb & Alice");
      assert.equal(releaseArtistText([], owner), "Rob");
      assert.equal(
        trackArtistTextForRelease(
          [trackArtist("Moon Band", "MAIN", 1), trackArtist("Mirb", "MAIN", 0)],
          rows,
          owner
        ),
        "Mirb & Moon Band"
      );
      assert.equal(
        trackArtistTextForRelease(
          [trackArtist("Alice", "FEATURED", 0)],
          [row("Mirb", 0)],
          owner
        ),
        "Mirb with Alice"
      );
    });
  });
});
