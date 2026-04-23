import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../utils/ownership";
import { User } from "@mirlo/prisma/client";
import { AppError, HttpCode } from "../../../../../utils/error";
import { endPreorderForTrackGroup } from "../../../../../utils/endPreorder";

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as { trackGroupId: string };
    const { makeTracksPreviewable } = req.body as {
      makeTracksPreviewable?: boolean;
    };
    const loggedInUser = req.user as User;

    try {
      if (
        makeTracksPreviewable !== undefined &&
        typeof makeTracksPreviewable !== "boolean"
      ) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "makeTracksPreviewable must be a boolean",
        });
      }

      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser
      );

      if (!trackGroup.isPreorder) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "This release is not a pre-order",
        });
      }

      const updatedTrackGroup = await endPreorderForTrackGroup(
        Number(trackGroupId),
        !!makeTracksPreviewable
      );

      res.json({ result: updatedTrackGroup });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Ends a pre-order campaign for a TrackGroup",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "options",
        schema: {
          type: "object",
          properties: {
            makeTracksPreviewable: {
              type: "boolean",
              description:
                "Whether to make all tracks previewable when ending the pre-order",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Pre-order ended successfully",
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
