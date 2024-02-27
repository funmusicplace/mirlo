import { NextFunction, Request, Response } from "express";
import prisma from "../../../../../prisma/prisma";
import processor, {
  findTrackGroupIdForSlug,
  trackGroupSingleInclude,
} from "../../../../utils/trackGroup";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { User } from "@prisma/client";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const loggedInUser = req.user as User | null;

    const { artistId }: { artistId: string } = req.query as {
      artistId: string;
    };
    if (!id) {
      return res.status(400);
    }

    try {
      const actualId = await findTrackGroupIdForSlug(id, artistId);
      let trackGroup;

      if (actualId && typeof actualId === "number") {
        trackGroup = await prisma.trackGroup.findFirst({
          where: {
            id: actualId,
            published: true,
            tracks: { some: { audio: { uploadState: "SUCCESS" } } },
          },
          include: trackGroupSingleInclude({
            loggedInUserId: loggedInUser?.id,
          }),
        });
      }

      if (!trackGroup) {
        res
          .status(404)
          .json({ error: `TrackGroup with id ${actualId} not found` });
        return next();
      }
      res.json({ result: processor.single(trackGroup) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns TrackGroup information",
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
        description: "A trackGroup that matches the id",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
