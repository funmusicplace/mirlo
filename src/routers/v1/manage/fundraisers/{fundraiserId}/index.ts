import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";

import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { serializeFundraiser } from "../../../../../serializers/fundraiser";
import { AppError } from "../../../../../utils/error";
import {
  assertFundraiserSlugAvailable,
  deleteFundraiserImages,
  fundraiserImagesInclude,
  generateUniqueFundraiserSlug,
  getFundraiserTotals,
} from "../../../../../utils/fundraiser";
import { resolvePayee } from "../../../../../utils/payments/payee";
import { preparePostContent } from "../../../../../utils/postContent";
import { videoEmbedUrl } from "../../../../../utils/videoEmbed";

type Params = {
  fundraiserId: string;
};

export default function () {
  const operations = {
    PUT: [userOrAppAuthenticated, fundraiserBelongsToLoggedInUser, PUT],
    DELETE: [userOrAppAuthenticated, fundraiserBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, fundraiserBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;

    try {
      const fundraiser = await prisma.fundraiser.findFirst({
        where: {
          id: Number(fundraiserId),
        },
        include: {
          images: fundraiserImagesInclude,
          trackGroups: {
            where: { deletedAt: null },
            include: {
              profile: {
                select: {
                  urlSlug: true,
                  id: true,
                  user: {
                    select: {
                      currency: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!fundraiser) {
        throw new AppError({
          httpCode: 404,
          description: "Fundraiser not found",
        });
      }

      return res.status(200).json({
        result: {
          ...serializeFundraiser(fundraiser),
          ...(await getFundraiserTotals(fundraiser)),
        },
      });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;
    const data = req.body;

    try {
      const newValues = pick(data, [
        "name",
        "description",
        "endDate",
        "goalAmount",
        "minPledge",
        "isAllOrNothing",
        "videoUrl",
        "urlSlug",
        "isPublic",
      ]);

      for (const field of ["isAllOrNothing", "isPublic"] as const) {
        if (
          newValues[field] !== undefined &&
          typeof newValues[field] !== "boolean"
        ) {
          throw new AppError({
            httpCode: 400,
            description: `${field} must be true or false`,
          });
        }
      }

      for (const field of ["description", "urlSlug"] as const) {
        if (
          newValues[field] !== undefined &&
          typeof newValues[field] !== "string"
        ) {
          throw new AppError({
            httpCode: 400,
            description: `${field} must be text`,
          });
        }
      }

      if (
        newValues.videoUrl !== undefined &&
        newValues.videoUrl !== null &&
        typeof newValues.videoUrl !== "string"
      ) {
        throw new AppError({
          httpCode: 400,
          description: "videoUrl must be text",
        });
      }

      if (newValues.name !== undefined) {
        if (typeof newValues.name !== "string" || !newValues.name.trim()) {
          throw new AppError({
            httpCode: 400,
            description: "A fundraiser needs a name",
          });
        }
        newValues.name = newValues.name.trim();
      }

      for (const field of ["goalAmount", "minPledge"] as const) {
        if (
          newValues[field] !== undefined &&
          !(Number.isInteger(newValues[field]) && newValues[field] >= 0)
        ) {
          throw new AppError({
            httpCode: 400,
            description: `${field} must be a whole number of cents, zero or more`,
          });
        }
      }

      const current = await prisma.fundraiser.findFirstOrThrow({
        where: { id: Number(fundraiserId) },
        include: {
          profile: {
            include: {
              user: { select: { stripeAccountId: true } },
              paymentToUser: { select: { stripeAccountId: true } },
            },
          },
        },
      });

      const activePledges = await prisma.fundraiserPledge.count({
        where: { fundraiserId: current.id, cancelledAt: null },
      });
      const openPledges = await prisma.fundraiserPledge.count({
        where: { fundraiserId: current.id, cancelledAt: null, paidAt: null },
      });

      if (activePledges > 0) {
        for (const field of ["goalAmount", "minPledge"] as const) {
          if (
            newValues[field] !== undefined &&
            newValues[field] !== current[field]
          ) {
            throw new AppError({
              httpCode: 400,
              description:
                "The goal and minimum pledge can't be changed once supporters have pledged",
            });
          }
        }
      }

      if (newValues.isPublic === true && !current.isPublic) {
        if (!resolvePayee({ profile: current.profile }).stripeAccountId) {
          throw new AppError({
            httpCode: 400,
            description: "Set up payments before making the fundraiser public",
          });
        }
      }

      if (newValues.isPublic === false && current.isPublic && openPledges > 0) {
        throw new AppError({
          httpCode: 400,
          description:
            "The fundraiser can't be made private while it has pledges",
        });
      }

      if (newValues.urlSlug !== undefined) {
        newValues.urlSlug = await assertFundraiserSlugAvailable(
          current,
          newValues.urlSlug
        );
      } else if (
        newValues.name !== undefined &&
        newValues.name !== current.name &&
        !current.isPublic
      ) {
        newValues.urlSlug = await generateUniqueFundraiserSlug(
          current.profileId,
          newValues.name,
          current.id
        );
      }

      if (typeof newValues.videoUrl === "string") {
        newValues.videoUrl = newValues.videoUrl.trim() || null;
        if (newValues.videoUrl && !videoEmbedUrl(newValues.videoUrl)) {
          throw new AppError({
            httpCode: 400,
            description: "The video link must be a YouTube or Vimeo video",
          });
        }
      }

      if (typeof newValues.description === "string") {
        newValues.description = await preparePostContent(
          newValues.description,
          [],
          { images: false }
        );
      }

      if (
        newValues.endDate !== undefined &&
        newValues.endDate !== null &&
        (typeof newValues.endDate !== "string" ||
          isNaN(Date.parse(newValues.endDate)))
      ) {
        throw new AppError({
          httpCode: 400,
          description: "End date isn't a valid date",
        });
      }

      // Supporters pledged under the current terms, so don't let them change
      // while there are pledges still waiting to be charged
      if (
        newValues.isAllOrNothing !== undefined &&
        newValues.isAllOrNothing !== current.isAllOrNothing &&
        openPledges > 0
      ) {
        throw new AppError({
          httpCode: 400,
          description:
            "All or nothing can't be changed while the fundraiser has pledges",
        });
      }

      await prisma.fundraiser.updateMany({
        where: { id: Number(fundraiserId) },
        data: newValues,
      });

      let fundraiser = await prisma.fundraiser.findFirst({
        where: { id: Number(fundraiserId) },
      });

      res.json({
        result: fundraiser ? serializeFundraiser(fundraiser) : fundraiser,
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a fundraiser belonging to a user",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "fundraiser",
        schema: {
          $ref: "#/definitions/Fundraiser",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated fundraiser",
        schema: {
          $ref: "#/definitions/Fundraiser",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as {
      fundraiserId: string;
    };
    try {
      await prisma.fundraiserPledge.updateMany({
        where: {
          fundraiserId: Number(fundraiserId),
          paidAt: null,
          cancelledAt: null,
          fundraiser: { status: "ACTIVE" },
        },
        data: { cancelledAt: new Date() },
      });

      const pledgesBeingCharged = await prisma.fundraiserPledge.count({
        where: {
          fundraiserId: Number(fundraiserId),
          paidAt: null,
          cancelledAt: null,
        },
      });
      if (pledgesBeingCharged > 0) {
        throw new AppError({
          httpCode: 409,
          description:
            "This fundraiser's pledges are being charged. It can be removed once every pledge is paid or cancelled.",
        });
      }

      await prisma.fundraiser.update({
        where: { id: Number(fundraiserId) },
        data: { trackGroups: { set: [] }, urlSlug: null },
      });

      await deleteFundraiserImages(Number(fundraiserId));

      await prisma.fundraiser.delete({
        where: { id: Number(fundraiserId) },
      });

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a fundraiser belonging to a user",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
