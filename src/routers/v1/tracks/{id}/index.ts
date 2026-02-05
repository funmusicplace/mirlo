import { NextFunction, Request, Response } from "express";
import processor from "../../../../utils/trackGroup";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const loggedInUser = req.user as User | undefined;
    try {
      const track = await prisma.track.findFirst({
        where: { id: Number(id) },
        include: {
          trackGroup: {
            include: {
              artist: {
                include: {
                  avatar: true,
                },
              },
              cover: true,
              ...(loggedInUser
                ? {
                    userTrackGroupPurchases: {
                      where: { userId: loggedInUser.id },
                      select: {
                        userId: true,
                      },
                    },
                  }
                : {}),
            },
          },
          trackArtists: true,
          audio: true,
          ...(loggedInUser
            ? {
                userTrackPurchases: {
                  where: { userId: loggedInUser.id },
                  select: {
                    userId: true,
                  },
                },
              }
            : {}),
        },
      });

      if (!track) {
        throw new AppError({ httpCode: 404, description: "Track not found" });
      }

      res.json({
        result: {
          ...track,
          isPlayable:
            track.isPreview ||
            track.userTrackPurchases.length > 0 ||
            track.trackGroup.userTrackGroupPurchases.length > 0,
          trackGroup: track
            ? processor.single(track.trackGroup, {
                loggedInUserId: loggedInUser?.id,
              })
            : {},
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns track information",
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
