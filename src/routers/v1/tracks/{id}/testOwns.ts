import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import { uniq } from "lodash";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";

type Query = {
  email?: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const { email } = req.query as unknown as Query;
    const user = req.user;
    try {
      const emails = uniq([email, user?.email].filter((e): e is string => !!e));
      let exists = false;
      if (emails.length > 0) {
        const purchase = await prisma.userTrackPurchase.findFirst({
          where: {
            user: { email: { in: emails } },
            trackId: Number(id),
          },
        });

        if (purchase) {
          exists = true;
        } else {
          const previewTrack = await prisma.track.findFirst({
            where: {
              id: Number(id),
              isPreview: true,
              trackGroup: {
                publishedAt: { lte: new Date() },
                userTrackGroupPurchases: {
                  some: { user: { email: { in: emails } } },
                },
              },
            },
          });
          exists = !!previewTrack;
        }
      }
      res.status(200);
      res.json({ result: { exists } });
    } catch {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
