import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { addSizesToImage } from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
import { generateFullStaticImageUrl } from "../../../../../utils/images";
import {
  finalCoversBucket,
  finalArtistAvatarBucket,
  finalPostImageBucket,
} from "../../../../../utils/minio";

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

    assertLoggedIn(req);
    const loggedInUser = req.user;

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
              profile: {
                include: { avatar: true },
              },
              featuredImage: true,
            },
          },
          profile: { omit: { apPrivateKey: true } },
          trackGroup: {
            include: {
              profile: {
                omit: { apPrivateKey: true },
                include: { user: { select: { currency: true } } },
              },
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
            include: {
              profileSubscriptionTier: {
                include: { profile: { omit: { apPrivateKey: true } } },
              },
            },
          },
          relatedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              profiles: {
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

      const processed = notifications.map((n) => {
        const {
          profileId,
          profile,
          subscription,
          post,
          trackGroup,
          relatedUser,
          ...rest
        } = n;

        const { profileSubscriptionTierId, profileSubscriptionTier, ...subscriptionRest } =
          subscription ?? ({} as NonNullable<typeof subscription>);

        return {
          ...rest,
          artistId: profileId ?? undefined,
          artist: profile,
          subscription: subscription
            ? {
                ...subscriptionRest,
                artistSubscriptionTierId: profileSubscriptionTierId,
                artistSubscriptionTier: profileSubscriptionTier
                  ? (() => {
                      const {
                        profileId: tierProfileId,
                        profile: tierProfile,
                        ...tierRest
                      } = profileSubscriptionTier;
                      return {
                        ...tierRest,
                        artistId: tierProfileId,
                        artist: tierProfile,
                      };
                    })()
                  : null,
              }
            : null,
          trackGroup: trackGroup
            ? (() => {
                const { profileId: tgProfileId, profile: tgProfile, ...tgRest } =
                  trackGroup;
                return {
                  ...tgRest,
                  artistId: tgProfileId,
                  artist: tgProfile,
                  currency: tgProfile?.user?.currency ?? "usd",
                  cover: addSizesToImage(finalCoversBucket, trackGroup.cover),
                  purchase: n.relatedUserId
                    ? (purchaseMap.get(
                        `${n.relatedUserId}_${n.trackGroupId}`
                      ) ?? null)
                    : null,
                };
              })()
            : null,
          post: post
            ? (() => {
                const { profileId: postProfileId, profile: postProfile, ...postRest } =
                  post;
                return {
                  ...postRest,
                  artistId: postProfileId,
                  artist: postProfile
                    ? (() => {
                        const { avatar, ...artistRest } = postProfile;
                        const sizedAvatar = addSizesToImage(
                          finalArtistAvatarBucket,
                          avatar
                        );
                        if (!sizedAvatar) {
                          return { ...artistRest, avatar: null };
                        }
                        const { profileId: avatarProfileId, ...avatarRest } =
                          sizedAvatar as typeof sizedAvatar & {
                            profileId?: number;
                          };
                        return {
                          ...artistRest,
                          avatar: {
                            ...avatarRest,
                            artistId: avatarProfileId,
                          },
                        };
                      })()
                    : null,
                  featuredImage: post.featuredImage
                    ? {
                        ...post.featuredImage,
                        src: generateFullStaticImageUrl(
                          post.featuredImage.id,
                          finalPostImageBucket,
                          post.featuredImage.extension
                        ),
                      }
                    : null,
                };
              })()
            : null,
          relatedUser: relatedUser
            ? (() => {
                const { profiles, ...relatedRest } = relatedUser;
                return {
                  ...relatedRest,
                  artists: profiles.map((a) => {
                    const { avatar, ...artistRest } = a;
                    const sizedAvatar = addSizesToImage(
                      finalArtistAvatarBucket,
                      avatar
                    );
                    if (!sizedAvatar) {
                      return { ...artistRest, avatar: null };
                    }
                    const { profileId: avatarProfileId, ...avatarRest } =
                      sizedAvatar as typeof sizedAvatar & {
                        profileId?: number;
                      };
                    return {
                      ...artistRest,
                      avatar: {
                        ...avatarRest,
                        artistId: avatarProfileId,
                      },
                    };
                  }),
                };
              })()
            : null,
        };
      });

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
