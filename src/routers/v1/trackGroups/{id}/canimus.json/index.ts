import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { serializeSingleArtistTrackGroupIntoCanimus } from "../../../../../serializers/artist";
import {
  listedTrackGroupInclude,
  profilePayeeInclude,
  whereForListedProfile,
  whereForListedTrackGroups,
} from "../../../../../utils/canimus";
import { AppError } from "../../../../../utils/error";
import { getInstanceName } from "../../../../../utils/settings";
import { findTrackGroupIdForSlug } from "../../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as { id: string };
    const { artistId } = req.query as { artistId?: string };

    try {
      if (Number.isNaN(Number(id)) && !artistId) {
        throw new AppError({
          httpCode: 400,
          description: "Looking up a release by slug needs an artistId",
        });
      }

      const trackGroupId = await findTrackGroupIdForSlug(id, artistId);
      const trackGroup = trackGroupId
        ? await prisma.trackGroup.findFirst({
            where: {
              id: trackGroupId,
              ...whereForListedTrackGroups(),
              AND: [
                { profile: whereForListedProfile(!!req.client?.fullCatalog) },
              ],
            },
            include: {
              ...listedTrackGroupInclude,
              profile: { include: profilePayeeInclude },
            },
          })
        : null;

      if (!trackGroup) {
        throw new AppError({ httpCode: 404, description: "Release not found" });
      }

      res.json(
        serializeSingleArtistTrackGroupIntoCanimus(
          trackGroup,
          trackGroup.profile,
          await getInstanceName()
        )
      );
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns one release and its tracks in Canimus format, following the same rules as sm/canimus.json",
    parameters: [
      { in: "path", name: "id", required: true, type: "string" },
      { in: "query", name: "artistId", type: "string" },
    ],
    responses: {
      200: { description: "The release" },
      404: { description: "Release not found or not listed" },
    },
  };

  return operations;
}
