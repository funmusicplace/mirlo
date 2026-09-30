import { NextFunction, Request, Response } from "express";

import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { chargeFundraiserPledges } from "../../../../../utils/fundraiser";

export default function () {
  const operations = {
    POST: [userAuthenticated, fundraiserBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId }: { fundraiserId?: string } = req.params;
    try {
      await chargeFundraiserPledges(Number(fundraiserId));

      return res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
