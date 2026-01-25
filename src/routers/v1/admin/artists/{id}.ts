import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { deleteArtist } from "../../../../utils/artist";
import { sendMailQueue } from "../../../../queues/send-mail-queue";

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { enabled, disableReason } = req.body as {
      enabled: boolean;
      disableReason?: string;
    };
    try {
      const artist = await prisma.artist.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }

      await prisma.artist.update({
        where: { id: Number(req.params.id) },
        data: {
          enabled,
        },
      });

      // If disabling and a reason is provided, send email to artist
      if (!enabled && disableReason && disableReason.trim()) {
        const reasonHtml = disableReason
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("</p><p>");

        await sendMailQueue.add("send-mail", {
          template: "artist-disabled-notification",
          message: {
            to: artist.user.email,
          },
          locals: {
            artistName: artist.name,
            userName: artist.user.name,
            reason: `<p>${reasonHtml}</p>`,
            supportEmail: "support@mirlo.space",
          },
        });
      }

      res.json({
        message: "success",
      });
    } catch (e) {
      next(e);
    }
  }

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const artist = await prisma.artist.findUnique({
        where: { id: Number(id) },
        select: {
          name: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
          id: true,
          user: {
            select: {
              email: true,
              id: true,
            },
          },
        },
      });
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      res.json({ result: artist });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const artist = await prisma.artist.findFirst({
        where: { id: Number(id) },
        select: {
          id: true,
          userId: true,
        },
      });
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      await deleteArtist(artist.userId, Number(id));
    } catch (e) {
      res.status(400);
      next();
    }
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes a user",
    parameters: [
      {
        in: "path",
        name: "id",
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
