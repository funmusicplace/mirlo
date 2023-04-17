import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
  userLoggedInWithoutRedirect,
} from "../../../../../auth/passport";

const prisma = new PrismaClient();

type Params = {
  artistId: number;
  userId: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
    POST: [userAuthenticated, userHasPermission("owner"), POST],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    if (userId) {
      const where = {
        userId: Number(userId),
        ...(loggedInUser && loggedInUser.id === Number(userId)
          ? {}
          : { enabled: true }),
      };
      const artists = await prisma.artist.findMany({
        where,
      });
      res.json({ results: artists });
    } else {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user artists",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A track that matches the id",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
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

  // FIXME: only allow creation for logged in user.
  async function POST(req: Request, res: Response) {
    const { name } = req.body;
    const { userId } = req.params as unknown as Params;
    const result = await prisma.artist.create({
      data: {
        name,
        user: {
          connect: {
            id: Number(userId),
          },
        },
      },
    });
    res.json(result);
  }

  POST.apiDoc = {
    summary: "Creates an artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "artist",
        schema: {
          $ref: "#/definitions/Artist",
        },
      },
    ],
    responses: {
      200: {
        description: "Created artist",
        schema: {
          $ref: "#/definitions/Artist",
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
