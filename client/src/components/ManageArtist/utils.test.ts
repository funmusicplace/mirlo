import { type IAudioMetadata, parseBuffer } from "music-metadata";
import { describe, expect, test } from "vitest";

import {
  convertMetaData,
  extractTrackArtists,
  normalizeMetadata,
} from "./utils";

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

  const withTitle = (container: string, title: string, artists: string[]) =>
    normalizeMetadata({
      common: { title, artists },
      format: { container },
      native: {},
    } as unknown as IAudioMetadata).common;

  test("re-decodes UTF-8 text that a WAV file's INFO chunk read as latin1", () => {
    const common = withTitle("WAVE", "CafÃ© Ã\u00a0 minuit", ["BjÃ¶rk"]);
    expect(common.title).toEqual("Café à minuit");
    expect(common.artists).toEqual(["Björk"]);
  });

  test("leaves genuine latin1 and non-latin1 WAV text alone", () => {
    expect(withTitle("WAVE", "Café", ["日本"]).title).toEqual("Café");
    expect(withTitle("WAVE", "Café", ["日本"]).artists).toEqual(["日本"]);
  });

  test("re-decodes WAV comments and native tags", () => {
    const normalized = normalizeMetadata({
      common: { comment: [{ text: "TrÃ¨s bien" }] },
      format: { container: "WAVE" },
      native: { exif: [{ id: "PERFORMER", value: "SinÃ©ad" }] },
    } as unknown as IAudioMetadata);
    expect(normalized.common.comment).toEqual(["Très bien"]);
    expect(extractTrackArtists(normalized)[0].artistName).toEqual("Sinéad");
  });

  test("doesn't touch text from other containers", () => {
    expect(withTitle("FLAC", "CafÃ©", []).title).toEqual("CafÃ©");
  });

  test("repairs UTF-8 tags in a real WAV file and keeps ISO-8859-1 ones", async () => {
    const encoder = new TextEncoder();
    const chunk = (id: string, ...body: Uint8Array[]) => {
      const bytes = Uint8Array.from(body.flatMap((part) => Array.from(part)));
      const out = new Uint8Array(8 + bytes.length + (bytes.length & 1));
      out.set(encoder.encode(id));
      new DataView(out.buffer).setUint32(4, bytes.length, true);
      out.set(bytes, 8);
      return out;
    };
    const format = new Uint8Array([
      1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x80, 0x3e, 0, 0, 2, 0, 16, 0,
    ]);
    const wav = chunk(
      "RIFF",
      encoder.encode("WAVE"),
      chunk("fmt ", format),
      chunk(
        "LIST",
        encoder.encode("INFO"),
        chunk("INAM", encoder.encode("L’Été à Montréal\0")),
        chunk("IART", encoder.encode("Mélodie Brûlée\0")),
        chunk("IGNR", new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0]))
      ),
      chunk("data", new Uint8Array(8))
    );

    const normalized = normalizeMetadata(
      await parseBuffer(wav, { mimeType: "audio/wav" })
    );

    expect(normalized.common.title).toBe("L’Été à Montréal");
    expect(normalized.common.artists).toEqual(["Mélodie Brûlée"]);
    expect(normalized.common.genre).toEqual(["Café"]);
  });
});

describe("extractTrackArtists", () => {
  test("falls back to common.artists when there is no PERFORMER tag", () => {
    const metadata = buildMetadata({
      artists: ["Bon Iver"],
      native: [{ id: "ARTIST", value: "Bon Iver" }],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "Bon Iver", role: "", appearsAs: "MAIN" },
    ]);
  });

  test("uses PERFORMER as the primary artist", () => {
    const metadata = buildMetadata({
      native: [{ id: "PERFORMER", value: "The Coverist" }],
    });

    expect(extractTrackArtists(metadata)).toEqual([
      { artistName: "The Coverist", role: "", appearsAs: "MAIN" },
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
      { artistName: "The Coverist", role: "", appearsAs: "MAIN" },
      {
        artistName: "Leonard Cohen",
        role: "composer",
        appearsAs: "CREDITS_ONLY",
      },
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
      { artistName: "Same Band", role: "", appearsAs: "MAIN" },
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
      { artistName: "Lowercase Tag", role: "", appearsAs: "MAIN" },
    ]);
  });

  test("returns an empty list when no artist data is present", () => {
    expect(extractTrackArtists(buildMetadata({}))).toEqual([]);
  });
});

describe("convertMetaData", () => {
  const upload = (artists: string[]) =>
    convertMetaData(
      {
        file: new File([], "track.flac"),
        metadata: {
          common: { title: "Track", track: { no: 1 }, artists },
          native: {},
          format: {},
        } as never,
      },
      0,
      {
        tracks: [],
        releaseArtists: [{ name: "Ada", urlSlug: "ada", artistId: 3 }],
      }
    ).trackArtists;

  test("keeps a guest as a main artist next to the release artist", () => {
    expect(upload(["Ada", "Theo"])).toEqual([
      {
        artistName: "Ada",
        role: "",
        appearsAs: "MAIN",
        order: 0,
        artistId: 3,
      },
      {
        artistName: "Theo",
        role: "",
        appearsAs: "MAIN",
        order: 1,
        artistId: undefined,
      },
    ]);
  });

  test("lets the track fall back to the release when its artists are the release artists", () => {
    expect(upload(["ada"])).toEqual([
      {
        artistName: "ada",
        role: "",
        appearsAs: "CREDITS_ONLY",
        order: 0,
        artistId: 3,
      },
    ]);
  });

  test("keeps a track by someone else as its own main artist", () => {
    expect(upload(["Theo"])).toEqual([
      {
        artistName: "Theo",
        role: "",
        appearsAs: "MAIN",
        order: 0,
        artistId: undefined,
      },
    ]);
  });
});
