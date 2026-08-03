import prisma from "@mirlo/prisma";
import { User, Prisma, Profile } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import {
  profileBelongsToLoggedInUser,
  canUserCreateProfiles,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { sendMailQueue } from "../../../../../../queues/send-mail-queue";
import { addSizesToImage } from "../../../../../../utils/artist";
import { AppError } from "../../../../../../utils/error";
import { getClient } from "../../../../../../utils/getClient";
import { finalUserAvatarBucket } from "../../../../../../utils/minio";
import { processSingleProfile } from "../../../../../../serializers/artist";

const sendProfileNotificationOfLabel = async (
  artistProfile: Profile,
  labelUser: User
) => {
  const client = await getClient();
  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: artistProfile.userId,
      notificationType: "LABEL_ADDED_ARTIST",
      relatedUserId: labelUser.id,
      profileId: artistProfile.id,
    },
  });
  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: artistProfile.userId,
        notificationType: "LABEL_ADDED_ARTIST",
        content: `
          <p>
            The label <strong>${labelUser.name}</strong> 
            has invited you to join their roster.
          </p>
          <p>To accept their invitation, 
            <a href="${client.applicationUrl}/manage/artists/${artistProfile.id}/customize#labels">
            manage your artist account on Mirlo</a>.
          </p>
          <p>
          If you do not wish to be associated with this label,
          you can ignore this message.
          </p>
        `,
        profileId: artistProfile.id,
        relatedUserId: labelUser.id,
      },
    });
  }

  // Queue email immediately to artist
  try {
    const profileOwner = await prisma.user.findUnique({
      where: { id: artistProfile.userId },
    });

    if (profileOwner?.email) {
      const labelProfile = await prisma.profile.findFirst({
        where: {
          userId: labelUser.id,
          isLabelProfile: true,
        },
      });

      await sendMailQueue.add("send-mail", {
        template: "announce-label-invite",
        message: {
          to: profileOwner.email,
        },
        locals: {
          artist: processSingleProfile(artistProfile),
          user: profileOwner,
          email: encodeURIComponent(profileOwner.email),
          host: process.env.API_DOMAIN,
          label: labelProfile ? processSingleProfile(labelProfile) : null,
          client: client.applicationUrl,
        },
      });
    }
  } catch (error) {
    console.error(
      `Failed to queue label invite email for artist ${artistProfile.id}`,
      error
    );
    // Don't fail if email queuing fails
  }
};

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, canUserCreateProfiles, POST],
    DELETE: [userAuthenticated, profileBelongsToLoggedInUser, DELETE],
  };

  async function GET(req: Request, res: Response) {
    const { artistId: artistProfileId } = req.params as { artistId: string };

    try {
      const artistLabels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistProfileId),
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
    let { artistId: artistProfileId }: { artistId?: string } = req.params;
    const { labelUserId, isLabelApproved } = req.body as {
      labelUserId?: number;
      isLabelApproved?: boolean;
    };

    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (!labelUserId || !Number.isFinite(Number(labelUserId))) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      const artistProfile = await prisma.profile.findFirst({
        where: {
          id: Number(artistProfileId),
          deletedAt: null,
        },
      });
      if (!artistProfile) {
        throw new AppError({
          httpCode: 404,
          description: "Artist not found",
        });
      }

      const labelUser = await prisma.user.findFirst({
        where: {
          id: labelUserId,
          deletedAt: null,
        },
      });

      if (!labelUser) {
        throw new AppError({
          httpCode: 404,
          description: "Label user not found",
        });
      }

      const data: Prisma.ArtistLabelCreateArgs["data"] = {
        labelUserId,
        artistId: Number(artistProfileId),
      };

      const isLabelAddingProfile = loggedInUser.id === labelUserId;
      const isProfileAddingLabel = loggedInUser.id === artistProfile.userId;

      if (!isLabelAddingProfile && !isProfileAddingLabel) {
        throw new AppError({
          httpCode: 401,
          description: "You are not allowed to add this label",
        });
      }

      if (isLabelAddingProfile) {
        data.isLabelApproved = isLabelApproved;
      }

      if (isProfileAddingLabel) {
        data.isArtistApproved = true;
      }

      // Check if the relationship already exists before upsert
      const existingRelationship = await prisma.artistLabel.findUnique({
        where: {
          labelUserId_artistId: {
            labelUserId,
            artistId: Number(artistProfileId),
          },
        },
      });

      const isNewRelationship = !existingRelationship;

      await prisma.artistLabel.upsert({
        where: {
          labelUserId_artistId: {
            labelUserId,
            artistId: Number(artistProfileId),
          },
        },
        create: data,
        update: data,
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistProfileId),
        },
      });

      // Only send notification on new relationship creation
      if (isLabelAddingProfile && isNewRelationship) {
        await sendProfileNotificationOfLabel(artistProfile, loggedInUser);
      }
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
    let { artistId: artistProfileId }: { artistId?: string } = req.params;
    const { labelUserId } = req.body as { labelUserId?: number };

    try {
      if (!labelUserId) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      await prisma.artistLabel.deleteMany({
        where: {
          labelUserId,
          artistId: Number(artistProfileId),
        },
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistProfileId),
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
