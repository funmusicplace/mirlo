import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";
import { doesPostBelongToUser } from "../../../../../utils/post";

type Params = {
  postId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params as unknown as Params;
    const { trackId } = req.body as unknown as {
      trackId: number;
    };
    try {
      assertLoggedIn(req);
      const ownedTrack = await prisma.track.findFirst({
        where: {
          id: trackId,
          trackGroup: { artist: { userId: req.user.id } },
        },
      });
      if (!ownedTrack) {
        throw new AppError({ httpCode: 403, description: "Forbidden" });
      }

      const postTracks = await prisma.postTrack.findMany({
        where: {
          postId: Number(postId),
        },
      });

      if (postTracks.find((pt) => pt.trackId === trackId)) {
        return res.json({ result: postTracks });
      }

      await prisma.postTrack.create({
        data: {
          postId: Number(postId),
          trackId: trackId,
          order: postTracks.length + 1,
        },
      });

      const refreshed = await prisma.postTrack.findMany({
        where: {
          postId: Number(postId),
        },
      });
      res.json({ result: refreshed });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a tracks on posts belonging to a user",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
    ],
    responses: {
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
