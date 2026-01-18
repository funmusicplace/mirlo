import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { processSingleTrackGroup } from "../../../../utils/trackGroup";

type Params = {
  id: number;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as unknown as Params;

    try {
      const trackGroup = await prisma.trackGroup.findUnique({
        where: { id: Number(id) },
      });

      if (!trackGroup) {
        return res.status(404).json({
          error: "Track group not found",
        });
      }

      const recommendations = await prisma.recommendedTrackGroup.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
        include: {
          recommendedTrackGroup: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  urlSlug: true,
                },
              },
              cover: true,
            },
          },
        },
      });

      res.json({
        results: recommendations.map((r) =>
          processSingleTrackGroup(r.recommendedTrackGroup)
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get recommended track groups for a track group",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "List of recommended track groups",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                $ref: "#/definitions/TrackGroup",
              },
            },
          },
        },
      },
      404: {
        description: "Track group not found",
      },
    },
  };

  return operations;
}
