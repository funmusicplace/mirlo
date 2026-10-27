import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { serializeSingleArtistIntoCanimus } from "../../../../../serializers/artist";
import { findProfileIdForURLSlug } from "../../../../../utils/artist";
import {
  listedProfileInclude,
  whereForListedProfile,
} from "../../../../../utils/canimus";
import { AppError } from "../../../../../utils/error";
import { getInstanceName } from "../../../../../utils/settings";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as { id: string };

    try {
      const profileId = await findProfileIdForURLSlug(id);
      const artist = profileId
        ? await prisma.profile.findFirst({
            where: {
              id: profileId,
              ...whereForListedProfile(!!req.client?.fullCatalog),
            },
            include: listedProfileInclude(),
          })
        : null;

      if (!artist) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }

      res.json(
        serializeSingleArtistIntoCanimus(artist, await getInstanceName())
      );
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns one artist and their releases in Canimus format, following the same rules as sm/canimus.json",
    parameters: [{ in: "path", name: "id", required: true, type: "string" }],
    responses: {
      200: { description: "The artist" },
      404: { description: "Artist not found or not listed" },
    },
  };

  return operations;
}
