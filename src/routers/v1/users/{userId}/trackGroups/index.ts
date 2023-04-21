import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";
import processor from "../../../../../utils/trackGroup";
import prisma from "../../../../../../prisma/prisma";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist(), POST],
  };

  // FIXME: only get trackgroups belonging to artists belonging to a user
  async function GET(req: Request, res: Response) {
    const { artistId } = req.query;

    let where: Prisma.TrackGroupWhereInput = {};
    if (artistId) {
      where.artistId = Number(artistId);
    }
    const results = await prisma.trackGroup.findMany({
      where,
      include: {
        tracks: {
          where: {
            deletedAt: null,
          },
        },
        cover: true,
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

  // FIXME: only allow creation of trackgroups for users that belong to the
  // logged in user
  async function POST(req: Request, res: Response) {
    try {
      const { title, about, artistId, published, releaseDate, enabled } =
        req.body;
      const trackgroup = await prisma.trackGroup.create({
        data: {
          title,
          about,
          artist: { connect: { id: artistId } },
          published,
          releaseDate: new Date(releaseDate),
          adminEnabled: enabled,
        },
      });
      res.json({ trackgroup });
    } catch (e) {
      res.status(500).json({
        error: "Something went wrong while trying to create a trackgroup",
      });
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
