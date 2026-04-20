import prisma from "@mirlo/prisma";
import { finalAudioBucket, removeObjectsFromBucket } from "../utils/minio";
import ffmpeg from "fluent-ffmpeg";
import logger from "../logger";
import { existsSync } from "fs";
import { Readable } from "stream";
import { Artist, Track, TrackArtist, TrackAudio } from "@mirlo/prisma/client";
import { Format } from "../jobs/generate-album";

export const deleteTrack = async (trackId: number) => {
  await prisma.track.delete({
    where: {
      id: trackId,
    },
  });

  const audio = await prisma.trackAudio.findFirst({
    where: {
      trackId: trackId,
    },
  });
  if (audio) {
    try {
      await removeObjectsFromBucket(finalAudioBucket, audio.id);
    } catch (e) {
      logger.error("no object found, that's all right though");
    }
    await prisma.trackAudio.delete({
      where: {
        trackId: trackId,
      },
    });
  }

  await prisma.trackArtist.deleteMany({
    where: {
      trackId: trackId,
    },
  });
};

const generateDestination = (
  format: string,
  destinationFolder: string,
  audioBitrate?: string
) => {
  const extension = `${audioBitrate ? "." + audioBitrate : ""}.${format}`;

  return `${destinationFolder}${extension}`;
};

const asStringValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((v) => (v === null || v === undefined ? "" : String(v).trim()))
      .filter(Boolean)
      .join(", ");
    return joined || undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
};

const addMetadataTag = (
  processor: ffmpeg.FfmpegCommand,
  key: string,
  value: unknown
) => {
  const normalizedValue = asStringValue(value);
  if (!normalizedValue) {
    return;
  }

  processor.outputOptions("-metadata", `${key}=${normalizedValue}`);
};

const addTrackMetadataTags = (
  processor: ffmpeg.FfmpegCommand,
  track: Track,
  trackGroupTitle: string | null,
  albumArtistName: string
) => {
  const trackMetadata = (track.metadata ?? {}) as {
    common?: Record<string, unknown>;
  };
  const common = trackMetadata.common ?? {};

  const lyricsValue =
    track.lyrics ?? common.lyrics ?? common.unsynchronisedLyrics;

  addMetadataTag(processor, "title", track.title);
  addMetadataTag(processor, "album", trackGroupTitle);
  addMetadataTag(processor, "album_artist", albumArtistName);
  addMetadataTag(processor, "track", track.order);
  addMetadataTag(processor, "lyrics", lyricsValue);
  // Different ffmpeg/id3 readers expose lyrics via different frame mappings.
  addMetadataTag(processor, "unsynchronised_lyrics", lyricsValue);
  addMetadataTag(processor, "USLT", lyricsValue);

  // Preserve common ID3-like metadata fields that often come from uploaded files.
  addMetadataTag(processor, "genre", common.genre);
  addMetadataTag(processor, "date", common.date ?? common.year);
  addMetadataTag(processor, "year", common.year);
  addMetadataTag(processor, "composer", common.composer);
  addMetadataTag(processor, "lyricist", common.lyricist);
  addMetadataTag(processor, "copyright", common.copyright); // FIXME we can draw this from our own licenseId
  addMetadataTag(processor, "label", common.label);
  addMetadataTag(processor, "language", common.language);
  addMetadataTag(processor, "isrc", track.isrc);

  const comments = [
    asStringValue(common.comment),
    asStringValue(common.description),
  ]
    .filter(Boolean)
    .join("\n");
  addMetadataTag(processor, "comment", comments);
};

const addTrackArtistRoleTags = (
  processor: ffmpeg.FfmpegCommand,
  trackArtists: TrackArtist[],
  fallbackArtistName: string
) => {
  const sortedArtists = [...(trackArtists ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  const coAuthors = sortedArtists
    .filter((artist) => artist.isCoAuthor)
    .map((artist) => artist.artistName)
    .filter(Boolean);
  const allArtistNames = sortedArtists
    .map((artist) => artist.artistName)
    .filter(Boolean);

  const artistField =
    coAuthors.length > 0
      ? coAuthors.join(", ")
      : allArtistNames.length > 0
        ? allArtistNames.join(", ")
        : fallbackArtistName;
  addMetadataTag(processor, "artist", artistField);

  const roleEntries = sortedArtists
    .filter((artist) => artist.artistName)
    .map((artist) => {
      const role = artist.role?.trim();
      return role ? `${artist.artistName} (${role})` : artist.artistName;
    });

  addMetadataTag(processor, "performer", roleEntries.join(", "));

  const composers = sortedArtists
    .filter((artist) => {
      const role = artist.role?.toLowerCase() ?? "";
      return role.includes("composer") || role.includes("writer");
    })
    .map((artist) => artist.artistName)
    .filter(Boolean);
  if (composers.length > 0) {
    addMetadataTag(processor, "composer", composers.join(", "));
  }
};

export const convertAudioToFormat = (
  content: {
    track: Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };
    artist: Artist;
    trackGroup: { title: string | null; coverLocation?: string };
  },
  stream: Readable,
  formatDetails: Format,
  goingTo: string,
  onError?: (err: unknown) => void,
  onSuccess?: (dunno: null) => void
) => {
  if (!content.track.audio) {
    logger.error("No audio found for track, cannot convert, and so we'll skip");
    return;
  }
  const audioId = content.track.audio.id;
  const { format, audioBitrate, audioCodec } = formatDetails;
  logger.info(
    `audioId ${audioId}: converting ${format} going to ${goingTo} @${audioBitrate}`
  );

  logger.info(
    `audioId ${audioId}: metadata: ${JSON.stringify(content.track.metadata)}`
  );

  let destination = generateDestination(format, goingTo, audioBitrate);
  logger.info(`audioId ${audioId}: destination: ${destination}`);

  const hasCoverArtForMp3 =
    format === "mp3" &&
    !!content.trackGroup.coverLocation &&
    fileExists(content.trackGroup.coverLocation);

  const processor = createFfmpegCommand(stream)
    .toFormat(format)
    // FIXME why don't these work?
    // .outputOptions("-map_metadata:s:a", "0:s:a")
    // .outputOption("-map_metadata:s:a 0:s:a")
    // .outputOptions("-map_metadata 0:s")
    .outputOptions("-charset", "UTF-8")
    .outputOptions("-id3v2_version", "3")
    .on("stderr", function (stderrLine) {
      // logger.info("Stderr output: " + stderrLine);
      // onError?.(stderrLine);
    })
    .on("error", (err: { message: unknown }) => {
      logger.error(`Error converting to ${format}: ${err.message}`);
      onError?.(err);
    })
    .on("end", () => {
      logger.info(
        `audioId ${audioId}: Done converting to ${format}${
          audioBitrate ? `@${audioBitrate}` : ""
        }`
      );
      onSuccess?.(null);
    });

  if (!hasCoverArtForMp3) {
    processor.noVideo();
  }

  addTrackMetadataTags(
    processor,
    content.track,
    content.trackGroup.title,
    content.artist.name
  );
  addTrackArtistRoleTags(
    processor,
    content.track.trackArtists ?? [],
    content.artist.name
  );

  if (content.track.metadata) {
    processor.outputOptions(
      "-metadata",
      // @ts-ignore
      `genre=${content.track.metadata?.common?.genre ?? "Unknown"}`
    );
  }

  if (hasCoverArtForMp3 && content.trackGroup.coverLocation) {
    processor
      .input(content.trackGroup.coverLocation)
      .outputOptions("-map", "0:a:0")
      .outputOptions("-map", "1:v:0")
      .outputOptions("-c:v", "mjpeg")
      .outputOptions("-disposition:v:0", "attached_pic")
      .outputOptions("-metadata:s:v", "title=Album cover")
      .outputOptions("-metadata:s:v", "comment=Cover (front)");
  }
  if (audioCodec) {
    processor.audioCodec(audioCodec);
  }
  if (audioBitrate) {
    processor.audioBitrate(audioBitrate);
  }

  processor.save(destination);
};

export const createFfmpegCommand = (stream: Readable) => ffmpeg(stream);

export const fileExists = (filePath: string) => existsSync(filePath);

export const updateTrackArtists = async (
  trackId: number,
  trackArtists?: {
    artistName: string;
    id: string;
    artistId: number;
    role: string;
    isCoAuthor: boolean;
    order: number;
  }[]
) => {
  if (!trackArtists) {
    return;
  }
  const currentTrackArtists = await prisma.trackArtist.findMany({
    where: {
      trackId: Number(trackId),
    },
  });

  let trackArtistIds = trackArtists.map((ta) => ta.id);

  const newTrackArtists = trackArtists.filter((ta) => !ta.id);
  const existingTrackArtists = trackArtists.filter((ta) => ta.id);
  const oldTrackArtists = currentTrackArtists.filter(
    (ta) => !trackArtistIds.includes(ta.id)
  );

  await prisma.trackArtist.createMany({
    data: newTrackArtists.map((nta) => ({
      trackId: Number(trackId),
      artistId: nta.artistId,
      artistName: nta.artistName,
      role: nta.role,
      isCoAuthor: nta.isCoAuthor,
      order: nta.order,
    })),
  });

  await Promise.all(
    existingTrackArtists.map((eta) =>
      prisma.trackArtist.update({
        where: {
          id: eta.id,
        },
        data: {
          artistId: eta.artistId,
          artistName: eta.artistName,
          role: eta.role,
          isCoAuthor: eta.isCoAuthor,
          order: eta.order,
        },
      })
    )
  );

  await prisma.trackArtist.deleteMany({
    where: {
      id: {
        in: oldTrackArtists.map((ota) => ota.id),
      },
    },
  });

  return prisma.trackArtist.findMany({
    where: {
      trackId: trackId,
    },
  });
};
