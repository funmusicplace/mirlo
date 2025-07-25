import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import processor from "../../../../../utils/trackGroup";
import prisma from "@mirlo/prisma";
import { getSiteSettings } from "../../../../../utils/settings";
import { getPlatformFeeForArtist } from "../../../../../utils/artist";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    try {
      const results = await prisma.trackGroup.findMany({
        where: {
          artistId: Number(artistId),
          isDrafts: false,
        },
        orderBy: {
          releaseDate: "desc",
        },
        include: {
          tracks: {
            where: {
              deletedAt: null,
            },
            include: {
              audio: true,
            },
          },
          artist: true,
          cover: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      res.json({
        results: results.map(processor.single),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Get all trackgroups belonging to a user",
    parameters: [
      {
        in: "query",
        name: "artistId",
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/TrackGroup",
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
    const {
      title,
      about,
      artistId,
      published,
      releaseDate,
      credits,
      type,
      minPrice,
      urlSlug,
    } = req.body;
    const user = req.user as User;

    if (!urlSlug) {
      return res.status(400).json({
        error: "Argument `urlSlug` is missing.",
      });
    }

    try {
      const userForCurrency = await prisma.user.findFirst({
        where: { id: user.id },
        select: {
          currency: true,
          promoCodes: true,
        },
      });
      const existingSlug = await prisma.trackGroup.findFirst({
        where: {
          artistId: Number(artistId),
          urlSlug,
        },
      });

      if (existingSlug) {
        return res.status(400).json({
          error: "Can't create a trackGroup with an existing urlSlug",
        });
      }

      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
        },
        include: {
          artistLabels: true,
        },
      });

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }

      let paymentToUserId: number | undefined = undefined;

      if (
        artist?.artistLabels?.some(
          (label) => label.labelUserId === user.id && label.canLabelAddReleases
        )
      ) {
        paymentToUserId = user.id;
      }

      const result = await prisma.trackGroup.create({
        data: {
          title,
          about,
          credits,
          type,
          artist: { connect: { id: artistId } },
          published,
          minPrice,
          paymentToUser: paymentToUserId
            ? { connect: { id: paymentToUserId } }
            : undefined,
          platformPercent: await getPlatformFeeForArtist(artist.id),
          currency: userForCurrency?.currency ?? "usd",
          releaseDate: releaseDate ? new Date(releaseDate) : undefined,
          adminEnabled: true,
          urlSlug,
        },
      });
      return res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Creates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
