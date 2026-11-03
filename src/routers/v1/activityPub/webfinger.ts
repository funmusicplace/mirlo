import { isActor, Link } from "@fedify/fedify/vocab";
import { NextFunction, Request, Response } from "express";

import { createApContext } from "../../../activityPub/federation";
import { userAuthenticated } from "../../../auth/passport";
import { AppError } from "../../../utils/error";

const hrefOf = (url: URL | Link | null | undefined) =>
  url instanceof Link ? url.href?.href : url?.href;

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  /**
   * Proxy a WebFinger lookup for a remote ActivityPub actor.
   * Accepts ?resource=acct:username@server and returns the actor object.
   * This runs server-side to avoid CORS issues from the browser.
   */
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { resource } = req.query;

    try {
      if (!resource || typeof resource !== "string") {
        throw new AppError({
          httpCode: 400,
          description:
            "resource query param is required (e.g. acct:user@server)",
        });
      }

      // Accept either "acct:user@server" or "user@server"
      const acct = resource.startsWith("acct:") ? resource.slice(5) : resource;
      const atIndex = acct.lastIndexOf("@");
      if (atIndex === -1) {
        throw new AppError({
          httpCode: 400,
          description: "resource must be in user@server format",
        });
      }

      const actor = await createApContext().lookupObject(`acct:${acct}`);

      if (!isActor(actor) || !actor.id) {
        throw new AppError({
          httpCode: 404,
          description: `No ActivityPub actor found for ${acct}`,
        });
      }

      const icon = await actor.getIcon({ suppressError: true });

      return res.json({
        result: {
          id: actor.id.href,
          name:
            actor.name?.toString() ??
            actor.preferredUsername?.toString() ??
            acct,
          preferredUsername:
            actor.preferredUsername?.toString() ?? acct.slice(0, atIndex),
          url: hrefOf(actor.url) ?? actor.id.href,
          inbox: actor.inboxId?.href,
          iconUrl: hrefOf(icon?.url),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Proxy a WebFinger lookup for a remote ActivityPub actor",
    parameters: [
      {
        in: "query",
        name: "resource",
        required: true,
        type: "string",
        description: "The acct: resource to look up (e.g. user@server.social)",
      },
    ],
    responses: {
      200: {
        description: "Actor information",
      },
      400: {
        description: "Bad request",
      },
      401: {
        description: "Not logged in",
      },
      404: {
        description: "Actor not found",
      },
    },
  };

  return operations;
}
