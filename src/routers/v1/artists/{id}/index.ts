import { NextFunction, Request, Response } from "express";
import { User } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import {
  checkIsUserSubscriber,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../../utils/artist";
import {
  headersAreForActivityPub,
  turnArtistIntoActor,
} from "../../../../activityPub/utils";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { includeDefaultTier }: { includeDefaultTier?: boolean } = req.query;
    const user = req.user as User;
    if (!id || id === "undefined") {
      return res.status(400);
    }
    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let isUserSubscriber = false;
      if (parsedId) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: parsedId,
            enabled: true,
          },
          include: singleInclude({ includeDefaultTier }),
        });

        isUserSubscriber = await checkIsUserSubscriber(user, parsedId);

        if (!artist) {
          res.status(404);
          return next();
        }

        if (headersAreForActivityPub(req.headers)) {
          res.json(await turnArtistIntoActor(artist));
          return next();
        } else {
          res.json({
            result: processSingleArtist(
              artist as any,
              user?.id,
              isUserSubscriber
            ),
          });
        }
      } else {
        res.status(404);
        return next();
      }
    } catch (e) {
      next(e);
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
