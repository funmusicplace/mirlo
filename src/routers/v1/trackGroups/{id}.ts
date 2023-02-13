import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;

    const trackGroup = await prisma.trackGroup.findUnique({
      where: { id: Number(id) },
    });
    res.json({ trackGroup });
  }

  GET.apiDoc = {
    summary: "Returns TrackGroup information",
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
        description: "A trackGroup that matches the id",
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
