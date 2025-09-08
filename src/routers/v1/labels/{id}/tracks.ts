import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { findUserIdForURLSlug } from "../../../../utils/user";
import {
  addSizesToImage,
  findArtistIdForURLSlug,
} from "../../../../utils/artist";
import {
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../../../../utils/minio";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const artistId = await findArtistIdForURLSlug(id);

      const labelProfile = await prisma.artist.findFirst({
        where: { id: artistId, isLabelProfile: true },
      });

      const labelArtists = await prisma.artist.findMany({
        where: {
          artistLabels: {
            some: {
              labelUserId: labelProfile?.userId,
              isLabelApproved: true,
              isArtistApproved: true,
            },
          },
        },
      });

      const tracks = await prisma.track.findMany({
        where: {
          trackGroup: {
            artistId: {
              in: [
                ...(labelProfile ? [labelProfile.id] : []),
                ...(labelArtists || []).map((a) => a.id),
              ],
            },
            ...whereForPublishedTrackGroups(),
          },
          isPreview: true,
        },
        include: {
          trackGroup: true,
        },
      });

      res.json({
        results: tracks,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns label information",
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
        description: "A label that matches the id",
        schema: {
          $ref: "#/definitions/User",
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
