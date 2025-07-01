import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import sendMail from "../../../../../jobs/send-mail";
import { Job } from "bullmq";

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { purchaseId } = req.params;
    const { message } = req.body;
    const user = req.user as User | undefined;

    const purchase = await prisma.merchPurchase.findFirst({
      where: {
        id: purchaseId,
      },
      include: {
        merch: true,
        user: true,
      },
    });

    if (purchase && purchase.userId === user?.id) {
      // User is authorized to contact the artist
      const artist = await prisma.artist.findFirst({
        where: {
          id: purchase.merch.artistId,
        },
        select: {
          id: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (artist) {
        // Send email to artist
        sendMail({
          data: {
            template: "artist-merch-contact-form",
            message: {
              to: artist.user.email,
            },
            locals: {
              purchase,
              artist,
              message,
              host: process.env.API_DOMAIN,
              client: process.env.REACT_APP_CLIENT_DOMAIN,
            },
          },
        } as Job);
      }
      return res.status(200).json({
        message: "Message sent to artist successfully",
      });
    }
    return res.status(403).json({ error: "Unauthorized" });
  }
  return operations;
}
