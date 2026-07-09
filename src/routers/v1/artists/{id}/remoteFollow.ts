import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { root } from "../../../../activityPub/utils";
import { AppError } from "../../../../utils/error";

const SUBSCRIBE_REL = "http://ostatus.org/schema/1.0/subscribe";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  /**
   * Resolve a fediverse "remote follow" redirect for an artist.
   *
   * Takes the follower's own handle (?handle=@you@server), looks up their
   * home server's OStatus subscribe template via WebFinger, and fills it in
   * with this artist's actor handle. The client then redirects the browser to
   * the returned URL, landing the user on their own server's follow screen.
   */
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: artistId } = req.params as unknown as Params;
    const { handle } = req.query;

    try {
      if (!handle || typeof handle !== "string") {
        throw new AppError({
          httpCode: 400,
          description: "handle query param is required (e.g. @you@server)",
        });
      }

      // Accept "@user@server", "user@server" or "acct:user@server"
      const cleaned = handle
        .trim()
        .replace(/^@/, "")
        .replace(/^acct:/, "");
      const atIndex = cleaned.lastIndexOf("@");
      if (atIndex <= 0 || atIndex === cleaned.length - 1) {
        throw new AppError({
          httpCode: 400,
          description: "handle must be in user@server format",
        });
      }

      const server = cleaned.slice(atIndex + 1);

      const artist = await prisma.profile.findFirst({
        where: { id: Number(artistId), enabled: true },
      });

      if (!artist) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }

      if (!artist.activityPub) {
        throw new AppError({
          httpCode: 400,
          description: "This artist is not available on the fediverse",
        });
      }

      // WebFinger the follower's account to discover their server's
      // remote-follow (OStatus subscribe) template.
      const webfingerUrl = `https://${server}/.well-known/webfinger?resource=acct:${cleaned}`;
      const webfingerRes = await fetch(webfingerUrl, {
        headers: { Accept: "application/json" },
      });

      if (!webfingerRes.ok) {
        throw new AppError({
          httpCode: 404,
          description: `Could not find ${cleaned}`,
        });
      }

      const webfingerData = (await webfingerRes.json()) as {
        links?: { rel: string; template?: string }[];
      };

      const subscribeLink = webfingerData.links?.find(
        (l) => l.rel === SUBSCRIBE_REL && !!l.template
      );

      if (!subscribeLink?.template) {
        throw new AppError({
          httpCode: 400,
          description: `${server} does not support remote follows`,
        });
      }

      const artistHandle = `${artist.urlSlug}@${root}`;
      const redirectUrl = subscribeLink.template.replace(
        "{uri}",
        encodeURIComponent(artistHandle)
      );

      return res.json({ result: { redirectUrl } });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Resolve a fediverse remote-follow redirect for an artist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      {
        in: "query",
        name: "handle",
        required: true,
        type: "string",
        description: "The follower's fediverse handle (e.g. @you@server)",
      },
    ],
    responses: {
      200: {
        description: "The remote-follow redirect URL",
      },
      400: {
        description: "Bad request",
      },
      404: {
        description: "Artist or follower not found",
      },
    },
  };

  return operations;
}
