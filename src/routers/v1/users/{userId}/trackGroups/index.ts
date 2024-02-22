import { Prisma, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";
import processor from "../../../../../utils/trackGroup";
import prisma from "../../../../../../prisma/prisma";
import slugify from "slugify";
import { getSiteSettings } from "../../../../../utils/settings";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
  };

  // FIXME: only get trackgroups belonging to artists belonging to a user
  async function GET(req: Request, res: Response) {
    const { artistId } = req.query;
    const user = req.user as User;
    let where: Prisma.TrackGroupWhereInput = {};
    if (artistId) {
      where.artistId = Number(artistId);
    } else {
      const artists = await prisma.artist.findMany({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });
      where.artistId = {
        in: artists.map((a) => a.id),
      };
    }

    const results = await prisma.trackGroup.findMany({
      where,
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
  }

  GET.apiDoc = {
    summary: "Get all trackgroups belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "number",
      },
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

    try {
      const userForCurrency = await prisma.user.findFirst({
        where: { id: user.id },
        select: {
          currency: true,
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
      const result = await prisma.trackGroup.create({
        data: {
          title,
          about,
          credits,
          type,
          artist: { connect: { id: artistId } },
          published,
          minPrice,
          platformPercent: (await getSiteSettings()).platformPercent,
          currency: userForCurrency?.currency ?? "USD",
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
        name: "userId",
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
