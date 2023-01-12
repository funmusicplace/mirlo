import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const users = await prisma.artist.findMany();
    res.json(users);
  }

  GET.apiDoc = {
    summary: "Returns all artists",
    responses: {
      200: {
        description: "A list of artists",
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

  return operations;
}
