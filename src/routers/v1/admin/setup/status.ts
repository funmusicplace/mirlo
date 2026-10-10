import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { getSiteSettings } from "../../../../utils/settings";
import { getSetupStatus } from "../../../../utils/setupStatus";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      return res.status(200).json({ result: await getSetupStatus(settings) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Reports the state of the instance setup",
    description:
      "Checks the database, Redis, the background worker, the scheduled tasks, the public address and the storage buckets, and says which setup steps are done. Each check reports a status (ok, warning, error) and never a secret or a raw error message.",
    responses: {
      200: {
        description: "The setup status",
      },
    },
  };

  return operations;
}
