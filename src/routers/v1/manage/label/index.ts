import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { singleInclude } from "../../../../utils/artist";
import { processSingleProfile } from "../../../../serializers/artist";

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
      const profiles = await prisma.artistLabel.findMany({
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
        results: profiles.map((row) => ({
          ...row,
          artist: processSingleProfile(row.artist),
          labelId: row.labelUserId,
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
