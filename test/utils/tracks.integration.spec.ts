import assert from "assert";
import { promises as fsPromises } from "fs";
import os from "os";
import path from "path";

import { Profile, Track, TrackArtist, TrackAudio } from "@mirlo/prisma/client";
import { afterEach, describe, it } from "mocha";
import { parseFile } from "music-metadata";
import { ITag } from "music-metadata/lib/type";

import { Format } from "../../src/jobs/generate-album";
import { convertAudioToFormat } from "../../src/utils/tracks";
import { createSilentWavBuffer } from "../utils";

const skipIntegration = process.env.SKIP_FFMPEG_INTEGRATION_TESTS === "1";
const describeIf = skipIntegration ? describe.skip : describe;

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx4kAAAAASUVORK5CYII=";

const createTrackArtist = (overrides?: Partial<TrackArtist>): TrackArtist => {
  return {
    id: "ta-integration-1",
    trackId: 1,
    artistId: null,
    artistName: "Lead Artist",
    role: "Vocal",
    isCoAuthor: true,
    order: 0,
    ...overrides,
  } as TrackArtist;
};

const createTrack = (
  audioId: string,
  trackArtists: TrackArtist[]
): Track & { audio?: TrackAudio; trackArtists: TrackArtist[] } => {
  return {
    id: 1,
    title: "Integration Track",
    order: 1,
    lyrics: "Integration test lyrics",
    metadata: {
      common: {
        genre: ["Experimental"],
      },
    },
    audio: {
      id: audioId,
    } as TrackAudio,
    trackArtists,
  } as unknown as Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };
};

const convertAudio = async ({
  track,
  artist,
  trackGroup,
  inputFile,
  outputBasename,
  format = { format: "mp3", audioCodec: "libmp3lame" },
}: {
  track: Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };
  artist: Profile;
  trackGroup: { title: string | null; coverLocation?: string };
  inputFile: string;
  outputBasename: string;
  format?: Format;
}) => {
  await new Promise<void>((resolve, reject) => {
    const source = fsPromises
      .open(inputFile, "r")
      .then((handle) => {
        const stream = handle.createReadStream();
        stream.on("close", async () => {
          await handle.close();
        });

        convertAudioToFormat(
          {
            track,
            artist,
            trackGroup,
          },
          stream,
          format,
          outputBasename,
          reject,
          () => resolve()
        );
      })
      .catch(reject);

    void source;
  });
};

// Vorbis comments (FLAC) are case-insensitive; ffmpeg writes "ALBUMARTIST" but
// "artist" lowercase. Match on a case-insensitive key so the assertion mirrors
// what a reader like Mixxx actually sees in the file. See #2245.
const hasNativeTag = (
  nativeTags: Record<string, ITag[]>,
  id: string
): boolean => {
  return Object.values(nativeTags)
    .flat()
    .some((tag) => tag.id.toLowerCase() === id.toLowerCase());
};

const containsLyricsText = (value: unknown, expected: string): boolean => {
  if (typeof value === "string") {
    return value.includes(expected);
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsLyricsText(entry, expected));
  }

  if (value && typeof value === "object") {
    const maybeText = (value as { text?: unknown }).text;
    if (typeof maybeText === "string") {
      return maybeText.includes(expected);
    }
  }

  return false;
};

const hasLyricsInNativeTags = (
  nativeTags: Record<string, ITag[]>,
  expected: string
): boolean => {
  return Object.values(nativeTags)
    .flat()
    .some((tag) => containsLyricsText(tag.value, expected));
};

describeIf("utils/tracks integration (real ffmpeg)", function () {
  this.timeout(20000);

  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("writes mp3 with metadata and embedded cover art", async () => {
    tempDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), "mirlo-track-test-")
    );

    const inputWav = path.join(tempDir, "input.wav");
    const coverPng = path.join(tempDir, "cover.png");
    const outputBase = path.join(tempDir, "output");
    const outputMp3 = `${outputBase}.mp3`;

    await fsPromises.writeFile(inputWav, createSilentWavBuffer());
    await fsPromises.writeFile(coverPng, Buffer.from(tinyPngBase64, "base64"));

    await convertAudio({
      track: createTrack("audio-integration-1", [
        createTrackArtist({ artistName: "Lead Artist", role: "Vocal" }),
        createTrackArtist({
          id: "ta-integration-2",
          artistName: "Writer Person",
          role: "Songwriter",
          isCoAuthor: false,
          order: 1,
        }),
      ]),
      artist: { name: "Album Artist" } as Profile,
      trackGroup: {
        title: "Integration Album",
        coverLocation: coverPng,
      },
      inputFile: inputWav,
      outputBasename: outputBase,
    });

    const parsed = await parseFile(outputMp3);

    assert.equal(parsed.common.title, "Integration Track");
    assert.equal(parsed.common.album, "Integration Album");
    assert.equal(parsed.common.albumartist, "Album Artist");
    assert.equal(parsed.common.artist, "Lead Artist");
    assert.deepEqual(parsed.common.genre, ["Experimental"]);
    const expectedLyrics = "Integration test lyrics";
    const hasCommonLyrics = (parsed.common.lyrics ?? []).some((lyrics) =>
      lyrics.includes(expectedLyrics)
    );
    assert.ok(
      hasCommonLyrics || hasLyricsInNativeTags(parsed.native, expectedLyrics),
      "expected lyrics to be present"
    );
    assert.ok(
      (parsed.common.picture?.length ?? 0) > 0,
      "expected embedded cover art"
    );
  });

  // Regression test for #2245: FLAC downloads carried "Album artist" but were
  // reported as missing an "Artist" field (Mixxx reads ARTIST, not
  // ALBUMARTIST). Assert that both land in the exported FLAC.
  it("writes flac with both artist and album_artist metadata", async () => {
    tempDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), "mirlo-track-test-")
    );

    const inputWav = path.join(tempDir, "input.wav");
    const outputBase = path.join(tempDir, "output");
    const outputFlac = `${outputBase}.flac`;

    await fsPromises.writeFile(inputWav, createSilentWavBuffer());

    await convertAudio({
      track: createTrack("audio-integration-flac", [
        createTrackArtist({ artistName: "Lead Artist", role: "Vocal" }),
      ]),
      artist: { name: "Album Artist" } as Profile,
      trackGroup: {
        title: "Integration Album",
      },
      inputFile: inputWav,
      outputBasename: outputBase,
      format: { format: "flac", audioCodec: "flac" },
    });

    const parsed = await parseFile(outputFlac);

    assert.equal(parsed.common.title, "Integration Track");
    assert.equal(parsed.common.album, "Integration Album");
    assert.equal(parsed.common.albumartist, "Album Artist");
    assert.equal(parsed.common.artist, "Lead Artist");

    // Guard against the exact #2245 symptom: the raw Vorbis comments must carry
    // both fields, not just the normalized common view.
    assert.ok(
      hasNativeTag(parsed.native, "ARTIST"),
      "expected an ARTIST vorbis comment"
    );
    assert.ok(
      hasNativeTag(parsed.native, "ALBUMARTIST"),
      "expected an ALBUMARTIST vorbis comment"
    );
  });
});
