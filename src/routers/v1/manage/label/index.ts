import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";

import { processSingleArtist, singleInclude } from "../../../../utils/artist";

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const user = req.user;

    try {
      const artists = await prisma.artistLabel.findMany({
        where: {
          labelUserId: user.id,
        },
        include: {
          artist: {
            include: singleInclude(),
          },
        } as any,
      });

      return res.json({
        results: artists.map((artist) => ({
          ...artist,

          artist: processSingleArtist(artist.artist),
          labelId: artist.labelUserId,
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns artist information that is associated with the label",
    responses: {
      200: {
        description: "all artists associated with the label",
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
