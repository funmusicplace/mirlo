import prisma from "@mirlo/prisma";

import { uploadAndSendToImageQueue } from "../queues/processImages";

import { APIContext } from "./file";

const processTrackGroupCover = (ctx: APIContext) => {
  return async (trackGroupId: number) => {
    return uploadAndSendToImageQueue(
      ctx,
      "trackGroupCover",
      "trackGroupCover",
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
