import { Request, Response } from "express";
import { User } from "@prisma/client";

import trackGroupProcessor from "../../trackGroups/processor";
import postProcessor from "../../posts/processor";

import prisma from "../../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { checkIsUserSubscriber } from "../../../../utils/artist";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;
    const user = req.user as User;

    if (!id) {
      return res.status(400);
    }

    const isUserSubscriber = await checkIsUserSubscriber(user, Number(id));

    const artist = await prisma.artist.findFirst({
      where: { id: Number(id), enabled: true },
      include: {
        trackGroups: {
          where: {
            published: true,
            releaseDate: {
              lte: new Date(),
            },
          },
          include: {
            tracks: true,
            cover: true,
          },
        },
        subscriptionTiers: true,
        posts: {
          where: {
            publishedAt: {
              lte: new Date(),
            },
            deletedAt: null,
          },
        },
      },
    });

    res.json({
      result: {
        ...artist,
        posts: artist?.posts.map((p) =>
          postProcessor.single(
            p,
            isUserSubscriber || artist.userId === user?.id
          )
        ),
        trackGroups: artist?.trackGroups.map(trackGroupProcessor.single),
      },
    });
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
