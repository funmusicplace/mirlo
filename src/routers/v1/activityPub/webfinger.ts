import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../utils/error";

export default function () {
  const operations = {
    GET: [GET],
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

      const server = acct.slice(atIndex + 1);

      // Step 1: WebFinger lookup
      const webfingerUrl = `https://${server}/.well-known/webfinger?resource=acct:${acct}`;
      const webfingerRes = await fetch(webfingerUrl, {
        headers: { Accept: "application/json" },
      });

      if (!webfingerRes.ok) {
        throw new AppError({
          httpCode: 404,
          description: `Could not find user ${acct}`,
        });
      }

      const webfingerData = (await webfingerRes.json()) as {
        links?: { rel: string; type?: string; href?: string }[];
      };

      const selfLink = webfingerData.links?.find(
        (l) => l.rel === "self" && l.type === "application/activity+json"
      );

      if (!selfLink?.href) {
        throw new AppError({
          httpCode: 404,
          description: `No ActivityPub actor found for ${acct}`,
        });
      }

      // Step 2: Fetch actor object
      const actorRes = await fetch(selfLink.href, {
        headers: { Accept: "application/activity+json" },
      });

      if (!actorRes.ok) {
        throw new AppError({
          httpCode: 404,
          description: `Could not fetch actor for ${acct}`,
        });
      }

      const actor = (await actorRes.json()) as {
        id: string;
        type: string;
        name?: string;
        preferredUsername?: string;
        url?: string;
        inbox?: string;
        icon?: { url?: string };
      };

      return res.json({
        result: {
          id: actor.id,
          name: actor.name ?? actor.preferredUsername ?? acct,
          preferredUsername: actor.preferredUsername ?? acct.slice(0, atIndex),
          url: actor.url ?? actor.id,
          inbox: actor.inbox,
          iconUrl: actor.icon?.url,
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
      404: {
        description: "Actor not found",
      },
    },
  };

  return operations;
}
