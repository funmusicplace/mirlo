import { NextFunction, Request, Response } from "express";
import { User, Prisma } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import { addSizesToImage } from "../../../../../../utils/artist";
import { finalUserAvatarBucket } from "../../../../../../utils/minio";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, POST],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function GET(req: Request, res: Response) {
    const { artistId } = req.params as unknown as { artistId: string };

    try {
      const artistLabels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistId),
        },
        include: {
          labelUser: {
            select: {
              name: true,
              email: true,
              userAvatar: true,
            },
          },
        },
      });
      res.json({
        results: artistLabels.map((label) => ({
          ...label,
          labelUser: {
            ...label.labelUser,
            userAvatar: addSizesToImage(
              finalUserAvatarBucket,
              label.labelUser.userAvatar
            ),
          },
        })),
      });
    } catch (e) {
      console.error(`/v1/artists/{id}/labels ${e}`);
      res.status(400);
    }
  }

  GET.apiDoc = {
    summary: "Returns labels an artist is associated with",
    responses: {
      200: {
        description: "A list of label users",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
          },
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

  async function POST(req: Request, res: Response, next: NextFunction) {
    let { artistId }: { artistId?: string } = req.params;
    const { labelUserId, isLabelApproved } = req.body as {
      labelUserId?: number;
      isLabelApproved?: boolean;
    };

    const loggedInUser = req.user as User;

    try {
      if (!labelUserId) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
          deletedAt: null,
        },
      });
      console.log("artist", artist);
      if (!artist) {
        throw new AppError({
          httpCode: 404,
          description: "Artist not found",
        });
      }

      const data: Prisma.ArtistLabelCreateArgs["data"] = {
        labelUserId,
        artistId: Number(artistId),
      };

      if (loggedInUser.id === labelUserId) {
        data.isLabelApproved = isLabelApproved;
      }

      if (loggedInUser.id === artist.userId) {
        data.isArtistApproved = true;
      }

      await prisma.artistLabel.create({
        data,
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistId),
        },
      });
      res.json({
        results: labels,
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Adds a label to an artist account",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Added new label",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    let { artistId }: { artistId?: string } = req.params;
    const { labelUserId } = req.body as { labelUserId?: number };

    try {
      if (!labelUserId) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      await prisma.artistLabel.deleteMany({
        where: {
          labelUserId,
          artistId: Number(artistId),
        },
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistId),
        },
      });
      res.json({
        results: labels,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
