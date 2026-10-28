import type { IAudioMetadata } from "music-metadata";
import { describe, expect, test } from "vitest";

import { extractTrackArtists, normalizeMetadata } from "./utils";

const buildMetadata = (opts: {
  artists?: string[];
  native?: { id: string; value: unknown }[];
}): IAudioMetadata =>
  ({
    common: { artists: opts.artists },
    native: opts.native ? { vorbis: opts.native } : {},
  }) as unknown as IAudioMetadata;

describe("normalizeMetadata", () => {
  test("converts structured comments and lyrics to plain strings", () => {
    const normalized = normalizeMetadata({
      common: {
        title: "Tidal Hours",
        comment: [{ text: "Reader migration" }, { language: "eng" }],
        lyrics: [
          {
            contentType: 1,
            timeStampFormat: 0,
            text: "First line",
            syncText: [],
          },
          {
            contentType: 1,
            timeStampFormat: 0,
            syncText: [{ text: "Second line" }],
          },
        ],
      },
      format: {},
      native: {},
    } as unknown as IAudioMetadata);

    expect(normalized.common.comment).toEqual(["Reader migration"]);
    expect(normalized.common.lyrics).toEqual(["First line", "Second line"]);
  });
});

describe("extractTrackArtists", () => {
  test("falls back to common.artists when there is no PERFORMER tag", () => {
    const metadata = buildMetadata({
      artists: ["Bon Iver"],
      native: [{ id: "ARTIST", value: "Bon Iver" }],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "Bon Iver", role: "", isCoAuthor: true },
    ]);
  });

  test("uses PERFORMER as the primary artist", () => {
    const metadata = buildMetadata({
      native: [{ id: "PERFORMER", value: "The Coverist" }],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "The Coverist", role: "", isCoAuthor: true },
    ]);
  });

  test("credits ARTIST as a secondary composer when both are present", () => {
    const metadata = buildMetadata({
      artists: ["Leonard Cohen"],
      native: [
        { id: "PERFORMER", value: "The Coverist" },
        { id: "ARTIST", value: "Leonard Cohen" },
      ],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "The Coverist", role: "", isCoAuthor: true },
      { artistName: "Leonard Cohen", role: "composer", isCoAuthor: false },
    ]);
  });

  test("does not duplicate when PERFORMER equals ARTIST", () => {
    const metadata = buildMetadata({
      native: [
        { id: "PERFORMER", value: "Same Band" },
        { id: "ARTIST", value: "Same Band" },
      ],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "Same Band", role: "", isCoAuthor: true },
    ]);
  });

  test("matches tag ids case-insensitively and ignores non-string values", () => {
    const metadata = buildMetadata({
      native: [
        { id: "performer", value: "Lowercase Tag" },
        { id: "ARTIST", value: 123 },
      ],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "Lowercase Tag", role: "", isCoAuthor: true },
    ]);
  });

  test("returns an empty list when no artist data is present", () => {
    expect(extractTrackArtists(buildMetadata({}))).toEqual([]);
  });
});
