import prisma from "@mirlo/prisma";
import { User, Prisma, Artist } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { getClient } from "../../../../../../activityPub/utils";
import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import {
  artistBelongsToLoggedInUser,
  canUserCreateArtists,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { sendMailQueue } from "../../../../../../queues/send-mail-queue";
import { addSizesToImage } from "../../../../../../utils/artist";
import { AppError } from "../../../../../../utils/error";
import { finalUserAvatarBucket } from "../../../../../../utils/minio";

const sendArtistNotificationOfLabel = async (
  artist: Artist,
  labelUser: User
) => {
  const client = await getClient();
  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: artist.userId,
      notificationType: "LABEL_ADDED_ARTIST",
      relatedUserId: labelUser.id,
      artistId: artist.id,
    },
  });
  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: artist.userId,
        notificationType: "LABEL_ADDED_ARTIST",
        content: `
          <p>
            The label <strong>${labelUser.name}</strong> 
            has invited you to join their roster.
          </p>
          <p>To accept their invitation, 
            <a href="${client.applicationUrl}/manage/artists/${artist.id}/customize#labels">
            manage your artist account on Mirlo</a>.
          </p>
          <p>
          If you do not wish to be associated with this label,
          you can ignore this message.
          </p>
        `,
        artistId: artist.id,
        relatedUserId: labelUser.id,
      },
    });
  }

  // Queue email immediately to artist
  try {
    const artistUser = await prisma.user.findUnique({
      where: { id: artist.userId },
    });

    if (artistUser?.email) {
      const labelProfile = await prisma.artist.findFirst({
        where: {
          userId: labelUser.id,
          isLabelProfile: true,
        },
      });

      await sendMailQueue.add("send-mail", {
        template: "announce-label-invite",
        message: {
          to: artistUser.email,
        },
        locals: {
          artist,
          user: artistUser,
          email: encodeURIComponent(artistUser.email),
          host: process.env.API_DOMAIN,
          label: labelProfile,
          labelArtist: labelProfile,
          client: client.applicationUrl,
        },
      });
    }
  } catch (error) {
    console.error(
      `Failed to queue label invite email for artist ${artist.id}`,
      error
    );
    // Don't fail if email queuing fails
  }
};

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, canUserCreateArtists, POST],
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

    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (!labelUserId || !Number.isFinite(Number(labelUserId))) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
          deletedAt: null,
        },
      });
      if (!artist) {
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
        artistId: Number(artistId),
      };

      const isLabelAddingArtist = loggedInUser.id === labelUserId;
      const isArtistAddingLabel = loggedInUser.id === artist.userId;

      if (!isLabelAddingArtist && !isArtistAddingLabel) {
        throw new AppError({
          httpCode: 401,
          description: "You are not allowed to add this label",
        });
      }

      if (isLabelAddingArtist) {
        data.isLabelApproved = isLabelApproved;
      }

      if (isArtistAddingLabel) {
        data.isArtistApproved = true;
      }

      // Check if the relationship already exists before upsert
      const existingRelationship = await prisma.artistLabel.findUnique({
        where: {
          labelUserId_artistId: {
            labelUserId,
            artistId: Number(artistId),
          },
        },
      });

      const isNewRelationship = !existingRelationship;

      await prisma.artistLabel.upsert({
        where: {
          labelUserId_artistId: {
            labelUserId,
            artistId: Number(artistId),
          },
        },
        create: data,
        update: data,
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistId),
        },
      });

      // Only send notification on new relationship creation
      if (isLabelAddingArtist && isNewRelationship) {
        await sendArtistNotificationOfLabel(artist, loggedInUser);
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
