import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import prisma from "../../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getBufferFromMinio,
  minioClient,
} from "../../../../../utils/minio";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import { canUserListenToTrack } from "../../../../../utils/ownership";

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  const alias = `${filename}/${segment}`;

  try {
    await minioClient.statObject(finalAudioBucket, alias);
    // await fsPromises.stat(path.join(ROOT, alias));
  } catch (e) {
    res.status(404);
    res.send();
    return;
  }

  try {
    const { buffer } = await getBufferFromMinio(
      minioClient,
      finalAudioBucket,
      alias
    );

    res.end(buffer, "binary");
  } catch (e) {
    console.error("error", e);
    res.status(400);
    res.send();
    return;
  }
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
    const user = req.user as User | undefined;

    try {
      const track = await prisma.track.findUnique({
        where: { id: Number(id) },
        include: {
          trackGroup: {
            include: {
              artist: true,
            },
          },
          audio: true,
        },
      });

      const isUserAbleToListenToTrack = await canUserListenToTrack(
        track?.id,
        user?.id
      );

      if (!track || !isUserAbleToListenToTrack) {
        res.status(404);
        return next();
      }

      if (track.audio) {
        const segmentString = segment.split("-")[1]?.split(".")?.[0];
        const segmentNumber = segmentString ? +segmentString : undefined;
        if (segmentNumber === 4) {
          await prisma.trackPlay.create({
            data: {
              trackId: track.id,
              ...(user ? { userId: user.id } : { ip: req.ip }),
            },
          });
        }
        await fetchFile(res, track.audio.id, segment);
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
    }
  }

  GET.apiDoc = {
    summary: "Returns track streaming playlist",
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
        description: "A track that matches the id",
        schema: {
          $ref: "#/definitions/Track",
        },
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
