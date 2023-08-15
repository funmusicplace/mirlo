import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import JSZip, { folder } from "jszip";
import { logger } from "../../../../logger";
import fs from "fs";

import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getFileFromMinio,
  minioClient,
} from "../../../../utils/minio";
const { MEDIA_LOCATION_DOWNLOAD_CACHE = "" } = process.env;

async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[],
  folderName: string
) {
  const rootFolder = `${MEDIA_LOCATION_DOWNLOAD_CACHE}/${folderName}`;

  var zip = new JSZip();
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
      const file = await fs.readFileSync(filePath);
      // Getting a buffer of the file to put it in the zip might
      // still be an issue for our memory issues.
      zip.file(trackTitle, file.buffer);
      logger.info(`Added track to zip file ${track.title}`);
    }
  }
  logger.info("Done compiling zip, putting it on the filesystem");
  return new Promise((resolve: (value: string) => void, reject) => {
    zip
      .generateNodeStream({ type: "nodebuffer", streamFiles: true })
      .pipe(fs.createWriteStream(`${rootFolder}.zip`))
      .on("finish", () => {
        resolve(`${rootFolder}.zip`);
        logger.info(`Wrote to zip ${rootFolder}`);
      });
  });

  // return zip.generateAsync({ type: "base64" });
}

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { id: userId } = req.user as User;

    try {
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: Number(trackGroupId),
          userId: Number(userId),
          trackGroup: {
            published: true,
          },
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
