import { NextFunction, Request, Response } from "express";

import { revokeConnectedApp } from "../../../../../auth/oidc/grants";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, grantId } = req.params;
      if (!(await revokeConnectedApp(Number(userId), grantId))) {
        throw new AppError({ httpCode: 404, description: "App not found" });
      }
      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Disconnects an app and revokes its tokens",
    parameters: [
      { in: "path", name: "userId", required: true, type: "number" },
      { in: "path", name: "grantId", required: true, type: "string" },
    ],
    responses: { 200: { description: "success" } },
  };

  return operations;
}
