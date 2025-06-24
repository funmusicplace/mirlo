import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { addSizesToImage } from "../../utils/artist";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
} from "../../utils/minio";

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.user as { email: string };
  try {
    const foundUser = await prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        email: true,
        id: true,
        name: true,
        artists: true,
        isAdmin: true,
        currency: true,
        language: true,
        wishlist: true,
        urlSlug: true,
        featureFlags: true,
        isLabelAccount: true,
        trackFavorites: {
          include: {
            track: {
              include: {
                trackGroup: {
                  include: {
                    artist: true,
                    cover: true,
                  },
                },
              },
            },
          },
        },
        userTrackGroupPurchases: {
          select: {
            trackGroupId: true,
          },
        },
        userTrackPurchases: {
          select: {
            trackId: true,
          },
        },
        userAvatar: true,
        artistUserSubscriptions: {
          where: {
            deletedAt: null,
          },
          select: {
            artistSubscriptionTier: {
              include: {
                artist: {
                  include: {
                    avatar: true,
                  },
                },
              },
            },
            id: true,
            userId: true,
            amount: true,
          },
        },
      },
    });

    res.status(200).json({
      result: {
        ...foundUser,
        userAvatar: foundUser?.userAvatar
          ? addSizesToImage(finalUserAvatarBucket, foundUser.userAvatar)
          : null,
        trackFavorites: foundUser?.trackFavorites.map((tf) => ({
          ...tf,
          track: {
            ...tf.track,
            trackGroup: {
              ...tf.track.trackGroup,
              cover: addSizesToImage(
                finalCoversBucket,
                tf.track.trackGroup.cover
              ),
            },
          },
        })),
        artistUserSubscriptions: foundUser?.artistUserSubscriptions.map(
          (aus) => ({
            ...aus,
            artistSubscriptionTier: {
              ...aus.artistSubscriptionTier,
              artist: {
                ...aus.artistSubscriptionTier.artist,
                avatar: addSizesToImage(
                  finalArtistAvatarBucket,
                  aus.artistSubscriptionTier.artist.avatar
                ),
              },
            },
          })
        ),
      },
    });
  } catch (e) {
    next(e);
  }
};

export default profile;
