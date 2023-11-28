import { NextFunction, Request, Response } from "express";
import { User } from "@prisma/client";

import prisma from "../../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import {
  checkIsUserSubscriber,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../../utils/artist";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const user = req.user as User;
    if (!id || id === "undefined") {
      return res.status(400);
    }
    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let isUserSubscriber = false;
      let artist: any;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: {
            id: parsedId,
            enabled: true,
          },
          include: singleInclude,
        });
        isUserSubscriber = await checkIsUserSubscriber(user, parsedId);

        if (!artist) {
          res.status(404);
          return next();
        }

        res.json({
          result: processSingleArtist(artist, user?.id, isUserSubscriber),
        });
      } else {
        res.status(404);
        return next();
      }
    } catch (e) {
      console.error(`artist/${id}`, e);
      res.status(500);
    }
  }

  GET.apiDoc = {
    summary: "Returns Artist information",
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
        description: "An artist that matches the id",
        schema: {
          $ref: "#/definitions/Artist",
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
