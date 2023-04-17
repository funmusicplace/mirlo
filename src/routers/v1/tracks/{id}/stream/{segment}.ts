import { PrismaClient, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
const fsPromises = fs.promises;
import path from "path";

const prisma = new PrismaClient();

const ROOT = "/data/media/audio";

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  const alias = `${filename}/${segment}`;
  // We test if this file works with m3u8.
  try {
    await fsPromises.stat(path.join(ROOT, alias));
  } catch (e) {
    res.status(404);
    return;
  }

  // if (process.env.NODE_ENV !== "production") {
  //   try {
  //     res.send(fs.createReadStream(path.join(ROOT, alias)));
  //   } catch (e) {
  //     console.error("error creating stream", e);
  //     res.status(404);
  //     return;
  //   }
  // } else {
  // FIXME: is there a way to make it so that nginx serves
  // this file?
  // ctx.set({
  //   'Content-Type': 'audio/mp4',
  //   // 'Content-Length': filesize, TODO if we have a file metadata
  //   // 'Content-Disposition': `inline; filename=${filename}${ext}`,
  //   'X-Accel-Redirect': alias // internal redirect
  // })
  // ctx.attachment(filename)
  // ctx.body = null
  await res.sendFile(`/${alias}`, { root: path.join(ROOT) });
  // }
};

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
    try {
      const user = req.user as User;
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
