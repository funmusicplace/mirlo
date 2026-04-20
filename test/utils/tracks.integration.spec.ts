import { afterEach, describe, it } from "mocha";
import assert from "assert";
import { promises as fsPromises } from "fs";
import os from "os";
import path from "path";
import { parseFile } from "music-metadata";
import { ITag } from "music-metadata/lib/type";
import { Artist, Track, TrackArtist, TrackAudio } from "@mirlo/prisma/client";
import { convertAudioToFormat } from "../../src/utils/tracks";

const skipIntegration = process.env.SKIP_FFMPEG_INTEGRATION_TESTS === "1";
const describeIf = skipIntegration ? describe.skip : describe;

const createSilentWavBuffer = (durationSeconds = 0.5) => {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * blockAlign;

  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  return wav;
};

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
}: {
  track: Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };
  artist: Artist;
  trackGroup: { title: string | null; coverLocation?: string };
  inputFile: string;
  outputBasename: string;
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
          {
            format: "mp3",
            audioCodec: "libmp3lame",
          },
          outputBasename,
          reject,
          () => resolve()
        );
      })
      .catch(reject);

    void source;
  });
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
      artist: { name: "Album Artist" } as Artist,
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
});
