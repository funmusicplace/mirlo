import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
const fsPromises = fs.promises;
import path from "path";
import stream from "stream";
import prisma from "../../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getObjectFromMinio,
  minioClient,
} from "../../../../../utils/minio";

// FIXME: REplace with MEDIA_LOCATIOn
const ROOT = "/data/media/audio";

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  const alias = `${filename}/${segment}`;
  console.log("alias", alias);
  try {
    await minioClient.statObject(finalAudioBucket, alias);
    // await fsPromises.stat(path.join(ROOT, alias));
  } catch (e) {
    res.status(404);
    res.send();
    return;
  }

  try {
    console.log("fetching buffer");
    const { buffer } = await getObjectFromMinio(
      minioClient,
      finalAudioBucket,
      alias
    );
    // res.setHeader("Content-Type", "application/octet-stream");
    var readStream = new stream.PassThrough();
    readStream.end(buffer);

    // res.set("Content-disposition", "attachment; filename=" + segment);
    // res.set("Content-Type", "text/plain");

    readStream.pipe(res);
    // res.end(buffer, "binary");
    // res.download()
    // await res.sendFile(`/${alias}`, { root: path.join(ROOT) });
    // }
  } catch (e) {
    console.error("error", e);
    res.status(400);
    res.send();
    return;
  }
};

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
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

      if (!track) {
        res.status(404);
        return next();
      }

      if (track.audio) {
        console.log("found a track", track.audio.id);
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
