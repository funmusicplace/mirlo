import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { setTokens } from "../../../../auth/utils";
import { logger } from "../../../../../logger";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      assertLoggedIn(req);
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: { id: true, email: true },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      setTokens(res, user);
      logger.info(`Admin ${req.user.email} logged in as user ${user.email}`);
      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Log in as another user (admin only)",
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
        description: "Login success",
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
