import { finalCoversBucket, incomingCoversBucket } from "./minio";
import prisma from "../../prisma/prisma";
import { APIContext } from "./file";
import { sendToImageQueue } from "./processImages";

const processTrackGroupCover = (ctx: APIContext) => {
  return async (trackGroupId: number) => {
    return sendToImageQueue(
      ctx,
      incomingCoversBucket,
      "trackGroupCover",
      finalCoversBucket,
      "artwork",
      async (fileInfo: { filename: string }) => {
        return prisma.trackGroupCover.upsert({
          create: {
            originalFilename: fileInfo.filename,
            trackGroupId: trackGroupId,
          },
          update: {
            originalFilename: fileInfo.filename,
            deletedAt: null,
          },
          where: {
            trackGroupId,
          },
        });
      }
    );
  };
};

export default processTrackGroupCover;
