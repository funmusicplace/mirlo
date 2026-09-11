import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { serializeProfile } from "../../../../serializers/artist";
import { singleInclude } from "../../../../utils/artist";

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
          artist: { deletedAt: null },
        },
        orderBy: [{ orderIndex: { sort: "asc", nulls: "last" } }],
        include: {
          artist: {
            include: {
              ...singleInclude({ includePrivate: true }),
              // Roster rows show a release count per artist. Counting in the
              // database beats counting the included trackGroups, which are
              // filtered down to what's publicly visible. See #2265.
              _count: {
                select: { trackGroups: { where: { deletedAt: null } } },
              },
            },
          },
        } as any,
      });

      return res.json({
        results: artists.map((artist) => ({
          ...artist,
          artist: serializeProfile(artist.artist),
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
