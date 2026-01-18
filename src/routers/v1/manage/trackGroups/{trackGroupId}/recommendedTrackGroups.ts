import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  trackGroupBelongsToLoggedInUser,
} from "../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import prisma from "@mirlo/prisma";
import { processSingleTrackGroup } from "../../../../../utils/trackGroup";
import { AppError } from "../../../../../utils/error";

type Params = {
  trackGroupId: number;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, trackGroupBelongsToLoggedInUser, GET],
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, trackGroupBelongsToLoggedInUser, DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

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
    responses: {
      200: {
        description: "Recommended track groups",
      },
    },
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const { recommendedTrackGroupId } = req.body;
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      if (!recommendedTrackGroupId) {
        return res.status(400).json({
          error: "recommendedTrackGroupId is required",
        });
      }

      const recommendedTrackGroup = await prisma.trackGroup.findUnique({
        where: { id: Number(recommendedTrackGroupId) },
      });

      if (!recommendedTrackGroup) {
        return res.status(404).json({
          error: "Recommended track group not found",
        });
      }

      if (trackGroup.id === recommendedTrackGroup.id) {
        return res.status(400).json({
          error: "Cannot recommend the same track group",
        });
      }

      const recommendation = await prisma.recommendedTrackGroup.upsert({
        where: {
          trackGroupId_recommendedTrackGroupId: {
            trackGroupId: trackGroup.id,
            recommendedTrackGroupId: recommendedTrackGroup.id,
          },
        },
        update: {},
        create: {
          trackGroupId: trackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup.id,
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

      res.json(recommendation);
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Add a recommended track group",
    responses: {
      200: {
        description: "Recommendation created",
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const { recommendedTrackGroupId } = req.query;
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      if (!recommendedTrackGroupId) {
        throw new AppError({
          httpCode: 400,
          description: "recommendedTrackGroupId is required",
        });
      }

      await prisma.recommendedTrackGroup.delete({
        where: {
          trackGroupId_recommendedTrackGroupId: {
            trackGroupId: trackGroup.id,
            recommendedTrackGroupId: Number(recommendedTrackGroupId),
          },
        },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Remove a recommended track group",
    responses: {
      200: {
        description: "Recommendation deleted",
      },
    },
  };

  return operations;
}
