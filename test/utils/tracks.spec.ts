import { describe, it, afterEach } from "mocha";
import assert from "assert";
import sinon from "sinon";
import { Readable } from "stream";
import { Track, TrackArtist, TrackAudio } from "@mirlo/prisma/client";
import * as ffmpegModule from "fluent-ffmpeg";
import * as fsModule from "fs";
import { convertAudioToFormat } from "../../src/utils/tracks";

type OutputOptionCall = [string, string?];

class FakeFfmpegCommand {
  public outputOptionCalls: OutputOptionCall[] = [];

  public inputCalls: string[] = [];

  public noVideoCallCount = 0;

  public savedDestination = "";

  noVideo() {
    this.noVideoCallCount += 1;
    return this;
  }

  toFormat() {
    return this;
  }

  outputOptions(option: string, value?: string) {
    this.outputOptionCalls.push([option, value]);
    return this;
  }

  on() {
    return this;
  }

  input(path: string) {
    this.inputCalls.push(path);
    return this;
  }

  audioCodec() {
    return this;
  }

  audioBitrate() {
    return this;
  }

  save(destination: string) {
    this.savedDestination = destination;
    return this;
  }
}

const createTrackArtist = (overrides?: Partial<TrackArtist>): TrackArtist =>
  ({
    id: "ta-1",
    trackId: 1,
    artistId: null,
    artistName: "Primary Artist",
    role: null,
    isCoAuthor: true,
    order: 0,
    ...overrides,
  }) as TrackArtist;

const createTrackWithAudio = (
  overrides?: Partial<
    Track & { audio?: TrackAudio; trackArtists: TrackArtist[] }
  >
): Track & { audio?: TrackAudio; trackArtists: TrackArtist[] } =>
  ({
    id: 1,
    title: "Test Track",
    order: 2,
    lyrics: "Track lyrics from DB",
    metadata: {
      common: {
        genre: ["Ambient", "Electronic"],
        comment: ["Comment from source"],
        description: ["Description from source"],
        isrc: ["ISRC-123"],
      },
    },
    audio: {
      id: "audio-1",
    } as TrackAudio,
    trackArtists: [createTrackArtist()],
    ...overrides,
  }) as unknown as Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };

describe("utils/tracks.convertAudioToFormat", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("adds id3 metadata, lyrics, genre, and role-based artist tags", () => {
    const command = new FakeFfmpegCommand();
    sinon.stub(ffmpegModule, "default").returns(command as any);
    sinon.stub(fsModule, "existsSync").returns(false);

    const track = createTrackWithAudio({
      trackArtists: [
        createTrackArtist({ artistName: "Lead Artist", role: "Vocal" }),
        createTrackArtist({
          id: "ta-2",
          artistName: "Writer One",
          role: "Songwriter",
          order: 1,
          isCoAuthor: false,
        }),
      ],
    });

    convertAudioToFormat(
      {
        track,
        artist: { name: "Album Artist" } as any,
        trackGroup: { title: "Album Name" },
      },
      Readable.from(Buffer.from("audio")),
      {
        format: "mp3",
        audioCodec: "libmp3lame",
        audioBitrate: "320",
      },
      "/tmp/output"
    );

    const metadataPairs = command.outputOptionCalls.filter(
      ([option, value]) => option === "-metadata" && typeof value === "string"
    );

    assert.ok(metadataPairs.some(([, v]) => v === "title=Test Track"));
    assert.ok(metadataPairs.some(([, v]) => v === "album=Album Name"));
    assert.ok(metadataPairs.some(([, v]) => v === "album_artist=Album Artist"));
    assert.ok(metadataPairs.some(([, v]) => v === "track=2"));
    assert.ok(
      metadataPairs.some(([, v]) => v === "lyrics=Track lyrics from DB"),
      "expected lyrics tag"
    );
    assert.ok(
      metadataPairs.some(([, v]) => v === "genre=Ambient, Electronic"),
      "expected genre from metadata.common.genre"
    );
    assert.ok(
      metadataPairs.some(
        ([, v]) =>
          v === "performer=Lead Artist (Vocal), Writer One (Songwriter)"
      ),
      "expected role-aware performer tag"
    );
    assert.ok(
      metadataPairs.some(([, v]) => v === "composer=Writer One"),
      "expected composer inferred from songwriter role"
    );
    assert.ok(
      metadataPairs.some(
        ([, v]) => v === "comment=Comment from source\nDescription from source"
      ),
      "expected merged comments"
    );
    assert.equal(command.noVideoCallCount, 1);
    assert.equal(command.savedDestination, "/tmp/output.320.mp3");
  });

  it("attaches cover art for mp3 when a cover file exists", () => {
    const command = new FakeFfmpegCommand();
    sinon.stub(ffmpegModule, "default").returns(command as any);
    sinon.stub(fsModule, "existsSync").returns(true);

    convertAudioToFormat(
      {
        track: createTrackWithAudio(),
        artist: { name: "Album Artist" } as any,
        trackGroup: {
          title: "Album Name",
          coverLocation: "/tmp/cover.jpg",
        },
      },
      Readable.from(Buffer.from("audio")),
      {
        format: "mp3",
        audioCodec: "libmp3lame",
      },
      "/tmp/output"
    );

    assert.deepEqual(command.inputCalls, ["/tmp/cover.jpg"]);
    assert.equal(command.noVideoCallCount, 0);
    assert.ok(
      command.outputOptionCalls.some(
        ([option, value]) => option === "-map" && value === "0:a:0"
      )
    );
    assert.ok(
      command.outputOptionCalls.some(
        ([option, value]) => option === "-map" && value === "1:v:0"
      )
    );
    assert.ok(
      command.outputOptionCalls.some(
        ([option, value]) =>
          option === "-disposition:v:0" && value === "attached_pic"
      )
    );
  });

  it("does not try to attach cover art for non-mp3 outputs", () => {
    const command = new FakeFfmpegCommand();
    sinon.stub(ffmpegModule, "default").returns(command as any);
    sinon.stub(fsModule, "existsSync").returns(true);

    convertAudioToFormat(
      {
        track: createTrackWithAudio(),
        artist: { name: "Album Artist" } as any,
        trackGroup: {
          title: "Album Name",
          coverLocation: "/tmp/cover.jpg",
        },
      },
      Readable.from(Buffer.from("audio")),
      {
        format: "flac",
        audioCodec: "flac",
      },
      "/tmp/output"
    );

    assert.equal(command.inputCalls.length, 0);
    assert.equal(command.noVideoCallCount, 1);
    assert.equal(command.savedDestination, "/tmp/output.flac");
  });
});
