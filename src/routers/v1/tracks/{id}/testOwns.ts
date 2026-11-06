import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";

type Query = {
  email?: string;
  token?: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const { email, token } = req.query as unknown as Query;
    const user = req.user;
    try {
      const identities = [
        ...(email && token
          ? [{ user: { email }, singleDownloadToken: token }]
          : []),
        ...(user ? [{ userId: user.id }] : []),
      ];
      let exists = false;
      if (identities.length > 0) {
        const purchase = await prisma.userTrackPurchase.findFirst({
          where: {
            OR: identities,
            trackId: Number(id),
          },
        });

        if (purchase) {
          exists = true;
        } else if (user) {
          const trackFromPurchasedRelease = await prisma.track.findFirst({
            where: {
              id: Number(id),
              OR: [{ isPreview: true }, { trackGroup: { isPreorder: false } }],
              trackGroup: {
                deletedAt: null,
                publishedAt: { lte: new Date() },
                userTrackGroupPurchases: {
                  some: { userId: user.id },
                },
              },
            },
          });
          exists = !!trackFromPurchasedRelease;
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
