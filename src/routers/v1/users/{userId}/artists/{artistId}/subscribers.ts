import { NextFunction, Request, Response } from "express";

import prisma from "../../../../../../../prisma/prisma";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../../../utils/artist";
import { downloadCSVFile } from "../../../../../../utils/download";
import { uniqBy } from "lodash";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import logger from "../../../../../../logger";

const csvColumns = [
  {
    label: "Email",
    value: "user.email",
  },
  {
    label: "User",
    value: "user.name",
  },
  {
    label: "Amount",
    value: "amount",
  },
  {
    label: "Currency",
    value: "currency",
  },
  {
    label: "Subscription Tier ID",
    value: "artistSubscriptionTierId",
  },
  {
    label: "Subscription Tier Name",
    value: "artistSubscriptionTier.name",
  },
  {
    label: "Created At",
    value: "createdAt",
  },
  {
    label: "Updated At",
    value: "updatedAt",
  },
];

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { artistId }: { artistId?: string } = req.params;

    try {
      const parsedId = await findArtistIdForURLSlug(artistId);
      const subscribers = await prisma.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTier: {
            artistId: parsedId,
            deletedAt: null,
          },
          deletedAt: null,
        },
        select: {
          amount: true,
          user: true,
          artistSubscriptionTier: true,
        },
      });

      if (req.query?.format === "csv") {
        return downloadCSVFile(res, "subscribers.csv", csvColumns, subscribers);
      } else {
        res.json({
          results: subscribers,
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns an artists subscribers",
    responses: {
      200: {
        description: "A list of artist's subscribers",
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              userId: {
                description: "ID",
                type: "number",
              },
            },
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
    let { artistId }: { artistId?: string } = req.params;

    const { subscribers } = req.body as { subscribers: { email: string }[] };

    try {
      const followTier = await prisma.artistSubscriptionTier.findFirst({
        where: {
          isDefaultTier: true,
          artistId: Number(artistId),
        },
      });

      if (followTier) {
        await Promise.all(
          uniqBy(subscribers, "email").map(async (subscriber) => {
            const created = await prisma.user.upsert({
              where: {
                email: subscriber.email,
              },
              create: {
                email: subscriber.email,
              },
              update: {
                updatedAt: new Date(),
              },
            });

            const found = await prisma.artistUserSubscription.findFirst({
              where: {
                userId: created.id,
                artistSubscriptionTierId: followTier.id,
              },
            });

            if (!found) {
              try {
                await prisma.artistUserSubscription.create({
                  data: {
                    userId: created.id,
                    artistSubscriptionTierId: followTier.id,
                    amount: 0,
                  },
                });
              } catch (e) {
                if (e instanceof PrismaClientKnownRequestError) {
                  // do nothing
                  if (e.code === "P2002") {
                    logger.error("err", e.cause, e.name, e.code, e.meta);
                  } else {
                    throw e;
                  }
                } else {
                  throw e;
                }
              }
            }
          })
        );
        await prisma.user.findMany({
          where: { email: { in: subscribers.map((s) => s.email) } },
        });
      }
      res.json({
        message: "Success",
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Adds subscribers to a user's account",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "subscribers",
        schema: {
          description: "The list of subscribers to add",
          required: ["subscribers"],
          type: "object",
          properties: {
            subscribers: {
              description: "The list of subscribers",
              type: "array",
              items: {
                type: "object",
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Added new subscribers",
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
