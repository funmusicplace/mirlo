import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import { chargeFundraiserPledges } from "../../../utils/fundraiser";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.body;
    try {
      if (!trackGroupId || !Number.isInteger(Number(trackGroupId))) {
        throw new AppError({
          httpCode: 400,
          description: "A trackGroupId is required",
        });
      }

      const trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
        select: { fundraiserId: true },
      });

      if (!trackGroup?.fundraiserId) {
        throw new AppError({
          httpCode: 404,
          description: "No fundraiser found for this track group",
        });
      }

      await chargeFundraiserPledges(trackGroup.fundraiserId);

      return res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
