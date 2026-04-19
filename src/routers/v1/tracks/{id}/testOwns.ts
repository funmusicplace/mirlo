import { Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";

type Query = {
  urlSlug?: string;
  artistId?: number;
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
      let userEmail = email;
      let exists = false;
      if (!userEmail && user) {
        userEmail = user.email;
      }
      if (userEmail) {
        const purchase = await prisma.userTrackPurchase.findFirst({
          where: {
            user: { email: userEmail },
            trackId: Number(id),
          },
        });

        if (purchase) {
          exists = true;
        } else {
          // Also allow download if the track is isPreview and the user has
          // purchased the containing track group
          const previewTrack = await prisma.track.findFirst({
            where: {
              id: Number(id),
              isPreview: true,
              trackGroup: {
                publishedAt: { lte: new Date() },
                userTrackGroupPurchases: {
                  some: { user: { email: userEmail } },
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
