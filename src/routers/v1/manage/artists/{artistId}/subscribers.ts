import prisma from "@mirlo/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { uniqBy } from "lodash";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import logger from "../../../../../logger";
import { findArtistIdForURLSlug } from "../../../../../utils/artist";
import { downloadCSVFile } from "../../../../../utils/download";
import { AppError } from "../../../../../utils/error";
import { grantSubscriptionTierReleases } from "../../../../../utils/subscriptionTier";

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

      if (!parsedId) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid artist id",
        });
      }

      const subscribers = await prisma.profileUserSubscription.findMany({
        where: {
          artistSubscriptionTier: {
            artistId: parsedId,
            deletedAt: null,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          amount: true,
          user: true,
          artistSubscriptionTier: true,
          artistUserSubscriptionCharges: {
            select: {
              id: true,
              transactionId: true,
              transaction: {
                select: {
                  platformCut: true,
                  stripeCut: true,
                  paymentStatus: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
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

    const { subscribers, artistSubscriptionTierId } = req.body as {
      subscribers: { email: string }[];
      artistSubscriptionTierId?: number;
    };

    try {
      const parsedArtistId = await findArtistIdForURLSlug(artistId);

      if (!parsedArtistId) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid artist id",
        });
      }

      // When a specific tier is requested, add subscribers to it; otherwise
      // fall back to the artist's default (follow) tier.
      const tier = artistSubscriptionTierId
        ? await prisma.profileSubscriptionTier.findFirst({
            where: {
              id: Number(artistSubscriptionTierId),
              artistId: parsedArtistId,
              deletedAt: null,
            },
          })
        : await prisma.profileSubscriptionTier.findFirst({
            where: {
              isDefaultTier: true,
              artistId: parsedArtistId,
            },
          });

      if (tier) {
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

            const found = await prisma.profileUserSubscription.findFirst({
              where: {
                userId: created.id,
                artistSubscriptionTierId: tier.id,
              },
            });

            if (!found) {
              try {
                await prisma.profileUserSubscription.create({
                  data: {
                    userId: created.id,
                    artistSubscriptionTierId: tier.id,
                    amount: 0,
                  },
                });

                // Match the privileges of a paying subscriber: grant access to
                // any albums attached to the tier. No transaction is created,
                // which is what marks this subscription as "free".
                await grantSubscriptionTierReleases({
                  userId: created.id,
                  tierId: tier.id,
                });
              } catch (e) {
                logger.error(`subscribers error code: ${(e as any).code} ${e}`);
                if ((e as any).code === "P2002") {
                  logger.error("instance of prismaclient");
                  // do nothing, unique constraint failed
                  // https://www.prisma.io/docs/orm/reference/error-reference#p2002
                  logger.error(
                    "err",
                    (e as PrismaClientKnownRequestError).cause,
                    (e as PrismaClientKnownRequestError).name,
                    (e as PrismaClientKnownRequestError).code,
                    (e as PrismaClientKnownRequestError).meta
                  );
                  return;
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
            artistSubscriptionTierId: {
              description:
                "The tier to add subscribers to. Defaults to the artist's default (follow) tier.",
              type: "integer",
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
