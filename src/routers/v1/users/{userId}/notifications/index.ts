import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";
import { addSizesToImage } from "../../../../../utils/artist";
import {
  finalCoversBucket,
  finalArtistAvatarBucket,
  finalPostImageBucket,
} from "../../../../../utils/minio";

import { generateFullStaticImageUrl } from "../../../../../utils/images";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { skip: skipQuery, take, notificationType } = req.query;

    const loggedInUser = req.user as User;

    if (Number(userId) === Number(loggedInUser.id)) {
      const types = notificationType
        ? ([] as string[]).concat(notificationType as string | string[])
        : undefined;

      const where = {
        userId: Number(userId),
        ...(types && types.length > 0
          ? { notificationType: { in: types as any[] } }
          : {}),
      };

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          post: {
            include: {
              artist: {
                include: { avatar: true },
              },
              featuredImage: true,
            },
          },
          artist: true,
          trackGroup: {
            include: {
              artist: true,
              cover: true,
              tracks: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  isPreview: true,
                  order: true,
                },
              },
            },
          },
          subscription: {
            include: { artistSubscriptionTier: { include: { artist: true } } },
          },
          relatedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              artists: {
                include: { avatar: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : 10,
      });

      const purchases = await prisma.userTrackGroupPurchase.findMany({
        where: {
          userId: {
            in: notifications
              .map((n) => n.relatedUserId)
              .filter((id): id is number => id !== null),
          },
          trackGroupId: {
            in: notifications
              .map((n) => n.trackGroupId)
              .filter((id): id is number => id !== null),
          },
        },
        include: { transaction: true },
      });

      const purchaseMap = new Map(
        purchases.map((p) => [`${p.userId}_${p.trackGroupId}`, p])
      );

      const processed = notifications.map((n) => ({
        ...n,
        trackGroup: n.trackGroup
          ? {
              ...n.trackGroup,
              cover: addSizesToImage(finalCoversBucket, n.trackGroup.cover),
              purchase: n.relatedUserId
                ? (purchaseMap.get(`${n.relatedUserId}_${n.trackGroupId}`) ??
                  null)
                : null,
            }
          : null,
        post: n.post
          ? {
              ...n.post,
              artist: n.post.artist
                ? {
                    ...n.post.artist,
                    avatar: addSizesToImage(
                      finalArtistAvatarBucket,
                      n.post.artist.avatar
                    ),
                  }
                : null,
              featuredImage: n.post.featuredImage
                ? {
                    ...n.post.featuredImage,
                    src: generateFullStaticImageUrl(
                      n.post.featuredImage.id,
                      finalPostImageBucket,
                      n.post.featuredImage.extension
                    ),
                  }
                : null,
            }
          : null,
        relatedUser: n.relatedUser
          ? {
              ...n.relatedUser,
              artists: n.relatedUser.artists.map((a) => ({
                ...a,
                avatar: addSizesToImage(finalArtistAvatarBucket, a.avatar),
              })),
            }
          : null,
      }));

      res.json({
        results: processed,
        total: await prisma.notification.count({ where }),
      });
    } else {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user notifications",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Notifications that belong to the user",
        schema: {
          type: "object",
          properties: {
            results: { type: "array", items: { type: "object" } },
            total: { type: "integer" },
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

  return operations;
}
