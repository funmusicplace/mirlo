import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import JSZip, { folder } from "jszip";
import { logger } from "../../../../logger";
import fs from "fs";
import archiver from "archiver";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getFileFromMinio,
  minioClient,
} from "../../../../utils/minio";
import { doesTrackGroupBelongToUser } from "../../../../utils/ownership";
const { MEDIA_LOCATION_DOWNLOAD_CACHE = "" } = process.env;

async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[],
  folderName: string
) {
  return new Promise(async (resolve: (value: string) => void, reject) => {
    const rootFolder = `${MEDIA_LOCATION_DOWNLOAD_CACHE}/${folderName}`;

    const output = fs.createWriteStream(`${rootFolder}.zip`);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", function () {
      logger.info(archive.pointer() + " total bytes");
      logger.info(
        "archiver has been finalized and the output file descriptor has closed."
      );
      resolve(`${rootFolder}.zip`);
    });
    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on("end", function () {
      logger.info("Data has been drained");
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", function (err) {
      if (err.code === "ENOENT") {
        // log warning
      } else {
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on("error", function (err) {
      throw err;
    });
    archive.pipe(output);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.title && track.audio) {
        logger.info(`Fetching file for tracks ${track.title}`);
        const order = track.order ? track.order : i + 1;
        const trackTitle = `${order} - ${track.title}.${track.audio.fileExtension}`;

        const { filePath } = await getFileFromMinio(
          minioClient,
          finalAudioBucket,
          `${track.audio.id}/original.${track.audio.fileExtension}`,
          rootFolder,
          trackTitle,
          logger
        );
        logger.info(`Fetched file for tracks ${filePath}`);

        archive.append(fs.createReadStream(filePath), { name: trackTitle });
        logger.info(`Added track to zip file ${track.title}`);
      }
    }
    logger.info("Done compiling zip, putting it on the filesystem");
    archive.finalize();
  });
}

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { id: userId } = req.user as User;

    try {
      const isCreator = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        userId
      );

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: Number(trackGroupId),
          ...(!isCreator
            ? {
                userId: Number(userId),
                trackGroup: {
                  published: true,
                },
              }
            : {}),
        },
        include: {
          trackGroup: {
            include: {
              tracks: {
                include: {
                  audio: true,
                },
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      if (!purchase) {
        res.status(404);
        return next();
      }
      const zip = await buildZipFileForPath(
        // FIXME: why is this being picky about typing?
        purchase.trackGroup.tracks as unknown as (Track & {
          audio: TrackAudio | null;
        })[],
        purchase.trackGroup.id.toString()
      );

      logger.info(`Put zip in location ${zip}`);

      res.sendFile(zip);
    } catch (e) {
      console.error("trackGroups/{id}/download", e);
      res.status(500);
      res.send({
        error: "Error downloading trackGroup",
      });
    }
  }

  GET.apiDoc = {
    summary: "Downloads a trackGroup file if the user has permission",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A zip file of trackgroup tracks",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
