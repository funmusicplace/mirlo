import prisma from "../../prisma/prisma";
import { finalAudioBucket, removeObjectsFromBucket } from "../utils/minio";
import ffmpeg from "fluent-ffmpeg";
import logger from "../logger";
import { Readable, PassThrough } from "stream";

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
    await removeObjectsFromBucket(finalAudioBucket, audio.id);

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
  audioId: string,
  stream: Readable,
  formatDetails: {
    format: "wav" | "flac" | "opus" | "mp3";
    audioCodec?: "flac" | "wav" | "opus" | "libmp3lame";
    audioBitrate?: "320" | "256" | "128";
  },
  goingTo: string,
  onError?: (err: unknown) => void,
  onSuccess?: (dunno: null) => void
) => {
  const { format, audioBitrate, audioCodec } = formatDetails;
  let destination = generateDestination(format, goingTo, audioBitrate);
  const processor = ffmpeg(stream)
    .noVideo()
    .toFormat(format)
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

  if (format === "mp3") {
    processor.addOptions("-write_xing", "0");
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
