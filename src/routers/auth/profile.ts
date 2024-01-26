import { NextFunction, Request, Response } from "express";
import prisma from "../../../prisma/prisma";

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.user as { email: string };
  try {
    const foundUser = await prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        email: true,
        id: true,
        name: true,
        artists: true,
        isAdmin: true,
        currency: true,
        wishlist: true,
        userTrackGroupPurchases: {
          select: {
            trackGroupId: true,
          },
        },
        artistUserSubscriptions: {
          where: {
            deletedAt: null,
          },
          select: {
            artistSubscriptionTier: {
              include: {
                artist: true,
              },
            },
            id: true,
            userId: true,
            amount: true,
          },
        },
      },
    });

    res.status(200).json({ result: foundUser });
  } catch (e) {
    next(e);
  }
};

export default profile;
