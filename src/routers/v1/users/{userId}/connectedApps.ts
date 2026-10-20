import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { listConnectedApps } from "../../../../auth/oidc/grants";
import {
  cookieSessionOnly,
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";

export default function () {
  const operations = {
    GET: [
      userAuthenticated,
      cookieSessionOnly,
      userHasPermission("owner"),
      GET,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      assertLoggedIn(req);
      res.json({
        results: await listConnectedApps(Number(req.params.userId)),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Lists the apps a user has connected to their account",
    parameters: [
      { in: "path", name: "userId", required: true, type: "number" },
    ],
    responses: { 200: { description: "The user's connected apps" } },
  };

  return operations;
}
