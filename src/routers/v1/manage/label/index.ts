import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { singleInclude } from "../../../../utils/artist";
import { processSingleArtist } from "../../../../utils/serialize/artist";
import { toApiArtistLabelWithArtist } from "../../../../utils/serialize/apiNaming";

type Params = {
  profileId: string;
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
          artist: { deletedAt: null },
        },
        orderBy: [{ orderIndex: { sort: "asc", nulls: "last" } }],
        include: {
          artist: {
            include: singleInclude({ includePrivate: true }),
          },
        } as any,
      });

      return res.json({
        results: artists.map((row) =>
          toApiArtistLabelWithArtist(row, processSingleArtist(row.artist), {
            labelId: row.labelUserId,
          })
        ),
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
          $ref: "#/definitions/Profile",
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
