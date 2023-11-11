import { Prisma, User } from "@prisma/client";
import { Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";
import processor from "../../../../../utils/trackGroup";
import prisma from "../../../../../../prisma/prisma";
import slugify from "slugify";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
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
          include: {
            audio: true,
          },
        },
        artist: true,
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
    const { title, about, artistId, published, releaseDate, credits } =
      req.body;
    const user = req.user as User;

    try {
      const trackGroup = await prisma.trackGroup.create({
        data: {
          title,
          about,
          credits,
          artist: { connect: { id: artistId } },
          published,
          releaseDate: new Date(releaseDate),
          adminEnabled: true,
          urlSlug: slugify(title).toLowerCase(),
        },
      });
      res.json({ trackGroup });
    } catch (e) {
      console.error(`POST users/${user.id}/trackGroups`, e);
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
