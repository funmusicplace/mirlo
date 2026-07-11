import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  profileBelongsToLoggedInUser,
} from "../../../../../auth/passport";
import { downloadCSVFile } from "../../../../../utils/download";
import { getClient } from "../../../../../utils/getClient";

type Params = {
  artistId: string;
};

const csvColumns = [
  {
    label: "Album ID",
    value: "trackGroupId",
  },
  {
    label: "Album",
    value: "trackgroup.title",
  },
  {
    label: "Group",
    value: "group",
  },
  {
    label: "Code",
    value: "downloadCode",
  },
  {
    label: "Redeemed by user",
    value: "redeemedByUser.name",
  },
  {
    label: "User email",
    value: "redeemedByUser.email",
  },
  {
    label: "Code redeem URL",
    value: "url",
  },
];

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params as unknown as Params;
    const { group } = req.query as unknown as { group: string };

    try {
      const { applicationUrl } = await getClient();
      const where: Prisma.TrackGroupDownloadCodesWhereInput = {
        trackGroup: {
          profileId: Number(profileId),
          deletedAt: null,
        },
      };

      if (typeof group === "string") {
        where.group = group;
      }

      const profileCodes = await prisma.trackGroupDownloadCodes.findMany({
        where,
        include: {
          trackGroup: {
            include: {
              profile: true,
            },
          },
          redeemedByUser: true,
        },
      });
      if (req.query?.format === "csv") {
        return downloadCSVFile(
          res,
          "codes.csv",
          csvColumns,
          profileCodes.map((c) => ({
            ...c,
            url: `${applicationUrl}/${c.trackGroup.profile.urlSlug}/release/${c.trackGroup.urlSlug}/redeem?code=${c.downloadCode}`,
          }))
        );
      }

      res.json({
        results: profileCodes.map((c) => ({
          ...c,
          url: `${applicationUrl}/${c.trackGroup.profile.urlSlug}/release/${c.trackGroup.urlSlug}/redeem?code=${c.downloadCode}`,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get all codes for an artist",
    parameters: [
      {
        in: "path",
        name: "artistId",
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
