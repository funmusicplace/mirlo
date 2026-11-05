import { NextFunction, Request, Response } from "express";

import {
  siteUserAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import {
  createSubsonicCredential,
  deleteSubsonicCredential,
  getSubsonicCredential,
} from "../../../../utils/subsonicCredentials";

export default function () {
  const operations = {
    GET: [siteUserAuthenticated, userHasPermission("owner"), GET],
    POST: [siteUserAuthenticated, userHasPermission("owner"), POST],
    DELETE: [siteUserAuthenticated, userHasPermission("owner"), DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        result: await getSubsonicCredential(Number(req.params.userId)),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Shows the user's Subsonic credentials",
    parameters: [
      { in: "path", name: "userId", required: true, type: "number" },
    ],
    responses: {
      200: { description: "The credentials, or null when none exist" },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        result: await createSubsonicCredential(Number(req.params.userId)),
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Generates new Subsonic credentials, replacing any existing ones",
    parameters: [
      { in: "path", name: "userId", required: true, type: "number" },
    ],
    responses: { 200: { description: "The new credentials" } },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      await deleteSubsonicCredential(Number(req.params.userId));
      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Revokes the user's Subsonic credentials",
    parameters: [
      { in: "path", name: "userId", required: true, type: "number" },
    ],
    responses: { 200: { description: "success" } },
  };

  return operations;
}
