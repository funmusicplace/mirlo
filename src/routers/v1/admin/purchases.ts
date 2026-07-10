import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { difference } from "lodash";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { getDateRange } from "../../../utils/dateRange";
import { AppError } from "../../../utils/error";
import { registerPurchase } from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const {
      skip: skipQuery,
      take,
      datePurchased,
      pricePaid,
    } = req.query as {
      skip: string;
      take: string;
      datePurchased: string;
      pricePaid: string;
    };

    try {
      let where: Prisma.UserTransactionWhereInput = {};

      const dateRange = getDateRange(datePurchased);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      if (pricePaid && pricePaid === "paid") {
        where.amount = {
          gt: 0,
        };
      } else if (pricePaid && pricePaid === "free") {
        where.amount = 0;
      }

      const itemCount = await prisma.userTransaction.count({ where });

      const purchases = await prisma.userTransaction.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          user: true,
          trackGroupPurchases: {
            include: {
              trackGroup: {
                include: { profile: { omit: { apPrivateKey: true } } },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json({
        results: purchases,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { users, trackGroupId, transaction } = req.body as {
      users: { email: string }[];
      trackGroupId: number;
      transaction?: {
        amount: number;
        currency: string;
        paymentStatus?: "PENDING" | "COMPLETED" | "FAILED";
        stripeId?: string;
      };
    };

    try {
      if (!users?.length) {
        throw new AppError({
          httpCode: 400,
          description: "At least one user email is required",
        });
      }

      if (
        transaction &&
        (isNaN(Number(transaction.amount)) || !transaction.currency)
      ) {
        throw new AppError({
          httpCode: 400,
          description: "A transaction needs an amount and a currency",
        });
      }

      await prisma.trackGroup.findFirstOrThrow({
        where: {
          id: trackGroupId,
        },
      });

      const existingUsers = await prisma.user.findMany({
        where: { email: { in: users.map((s) => s.email) } },
        select: { email: true, id: true },
      });

      const purchases = [];
      for (const user of existingUsers) {
        let userTransactionId: string | undefined;
        if (transaction) {
          const createdTransaction = await prisma.userTransaction.create({
            data: {
              userId: user.id,
              amount: Number(transaction.amount),
              currency: transaction.currency.toLowerCase(),
              paymentStatus: transaction.paymentStatus ?? "COMPLETED",
              stripeId: transaction.stripeId || undefined,
            },
          });
          userTransactionId = createdTransaction.id;
        }

        const purchase = await registerPurchase({
          userId: user.id,
          trackGroupId,
          pricePaid: transaction ? Number(transaction.amount) : 0,
          currencyPaid: transaction?.currency.toLowerCase() ?? "usd",
          paymentProcessorKey: transaction?.stripeId ?? null,
          transactionId: userTransactionId,
        });
        purchases.push(purchase);
      }

      res.json({
        results: purchases,
        notFoundEmails: difference(
          users.map((u) => u.email),
          existingUsers.map((u) => u.email)
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Creates trackGroup purchases for a list of user emails, optionally with a transaction per user",
    parameters: [
      {
        in: "body",
        name: "purchase",
        schema: {
          type: "object",
          required: ["users", "trackGroupId"],
          properties: {
            users: {
              type: "array",
              items: {
                type: "object",
                properties: { email: { type: "string" } },
              },
            },
            trackGroupId: { type: "number" },
            transaction: {
              type: "object",
              properties: {
                amount: {
                  type: "number",
                  description: "Amount in cents",
                },
                currency: { type: "string" },
                paymentStatus: {
                  type: "string",
                  enum: ["PENDING", "COMPLETED", "FAILED"],
                },
                stripeId: { type: "string" },
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The created purchases and any emails without an account",
      },
    },
  };

  return operations;
}
