import prisma from "@mirlo/prisma";
import { finalAudioBucket, removeObjectsFromBucket } from "../utils/minio";
import ffmpeg from "fluent-ffmpeg";
import logger from "../logger";
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

export const convertAudioToFormat = (
  content: {
    track: Track & { audio?: TrackAudio; trackArtists: TrackArtist[] };
    artist: Artist;
    trackGroup: { title: string | null };
    coverLocation: string;
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

  const artists = (
    content.track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? []
  ).map((artist) => artist.artistName);

  let destination = generateDestination(format, goingTo, audioBitrate);
  const processor = ffmpeg(stream)
    .noVideo()
    .toFormat(format)
    // FIXME why don't these work?
    // .outputOptions("-map_metadata:s:a", "0:s:a")
    // .outputOption("-map_metadata:s:a 0:s:a")
    // .outputOptions("-map_metadata 0:s")
    .outputOptions("-id3v2_version 3")
    .outputOptions("-metadata", `title=${content.track.title}`)
    .outputOptions("-metadata", `album=${content.trackGroup.title}`)
    .outputOptions("-metadata", `album_artist=${content.artist.name}`)
    .outputOptions("-metadata", `track=${content.track.order}`)
    .on("stderr", function (stderrLine) {
      // logger.info("Stderr output: " +resolve stderrLine);
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

  if (artists.length) {
    processor.outputOptions("-metadata", `artist=${artists.join(", ")}`);
  }

  if (content.track.metadata) {
    processor.outputOptions(
      "-metadata",
      // @ts-ignore
      `genre=${content.track.metadata?.common?.genre ?? "Unknown"}`
    );
  }

  if (format === "mp3") {
    // FIXME: this seems to fail for some things. Maybe to do with webp vs jpeg?
    // processor.addOptions("-write_xing", "0");
    // processor.addInput(content.coverLocation);
    // processor.outputOptions("-metadata:s:v", `title="Album cover"`);
    // processor.videoCodec("copy");
    // processor.outputOptions("-metadata:s:v", `commment="Cover (front)`);
  }
  if (audioCodec) {
    processor.audioCodec(audioCodec);
  }
  if (audioBitrate) {
    processor.audioBitrate(audioBitrate);
  }

  processor.save(destination);
};

export const updateTrackArtists = async (
  trackId: number,
  trackArtists?: {
    artistName: string;
    id: string;
    artistId: number;
    role: string;
    isCoAuthor: boolean;
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
