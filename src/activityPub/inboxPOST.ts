import crypto from "crypto";

import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import logger from "../logger";
import { findArtistIdForURLSlug } from "../utils/artist";
import { AppError } from "../utils/error";

import { fetchActivityPubDocument } from "./httpClient";
import {
  headersAreForActivityPub,
  rootArtist,
  verifySignature,
  signAndSendActivityPubMessage,
} from "./utils";

async function sendAcceptMessage(
  body: { [key: string]: unknown },
  artistUrlSlug: string
) {
  const guid = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const message = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${rootArtist}${artistUrlSlug}#activity-${guid}`,
    type: "Accept",
    actor: `${rootArtist}${artistUrlSlug}`,
    object: body,
    to: [body.actor],
    published: now.toISOString(),
  };

  const actor = body.actor;
  if (!actor || typeof actor !== "string") {
    throw new Error("Cannot send Accept message without a valid actor URL");
  }

  const actorDoc = await fetchActivityPubDocument(actor);
  const inboxUrl = actorDoc.inbox;

  if (!inboxUrl || typeof inboxUrl !== "string") {
    throw new Error(`No inbox found for actor ${actor}`);
  }

  const destinationDomain = new URL(inboxUrl).hostname;

  await signAndSendActivityPubMessage(
    message,
    artistUrlSlug,
    inboxUrl,
    destinationDomain
  );

  return inboxUrl;
}

const inboxPOST = async (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore - requestId added by middleware
  const log = req.logger || logger;
  let { id }: { id?: string } = req.params;
  if (!id || id === "undefined") {
    return res.status(400);
  }

  try {
    if (!headersAreForActivityPub(req.headers, "POST")) {
      throw new AppError({
        httpCode: 400,
        description: "Only accepts ActivityPub headers",
      });
    }

    // Verify HTTP signature
    const signatureHeader = req.headers.signature as string;
    if (!signatureHeader) {
      throw new AppError({
        httpCode: 401,
        description: "Missing HTTP signature",
      });
    }

    // Check for valid activity structure first
    if (!req.body.actor || !req.body.type) {
      throw new AppError({
        httpCode: 400,
        description: "Not a valid Activity",
      });
    }

    // Verify signature, but allow Delete activities if verification fails due to Gone (410)
    try {
      await verifySignature(req, signatureHeader);
    } catch (e) {
      // Allow Delete activities from gone accounts (410 status)
      if (
        req.body.type === "Delete" &&
        e instanceof AppError &&
        e.description?.includes("Gone")
      ) {
        log.info(
          `Allowing Delete activity from gone account: ${req.body.actor}`
        );
      } else {
        throw e;
      }
    }

    const parsedId = await findArtistIdForURLSlug(id);

    const artist = await prisma.artist.findFirst({
      where: {
        id: parsedId,
      },
    });
    if (!artist) {
      throw new AppError({
        httpCode: 404,
        description: "Artist not found, must use urlSlug",
      });
    }

    if (!["Follow", "Undo", "Delete"].includes(req.body.type)) {
      throw new AppError({
        httpCode: 501,
        description: `${req.body.type} not implemented`,
      });
    }

    if (req.body.type === "Follow") {
      const acceptInboxUrl = await sendAcceptMessage(req.body, artist.urlSlug);
      log.info(
        `ActivityPub Follow accepted for ${req.body.actor}; Accept delivered to ${acceptInboxUrl}`
      );
      // update followers
      await prisma.activityPubArtistFollowers.upsert({
        where: {
          actor_artistId: { artistId: artist.id, actor: req.body.actor },
        },
        create: {
          artistId: artist.id,
          actor: req.body.actor,
        },
        update: {
          artistId: artist.id,
          actor: req.body.actor,
        },
      });
      await prisma.notification.create({
        data: {
          notificationType: "AP_FOLLOW",
          userId: artist.userId,
          metadata: {
            ap: { actor: req.body.actor },
          },
        },
      });
    }
    if (req.body.type === "Undo") {
      // Undo activities have the original activity wrapped in the "object" field
      if (req.body.object?.type === "Follow") {
        // Remove from followers
        await prisma.activityPubArtistFollowers.deleteMany({
          where: {
            artistId: artist.id,
            actor: req.body.actor,
          },
        });

        log.info(`ActivityPub Follow removed for ${req.body.actor} via Undo`);
      }
    }
    if (req.body.type === "Delete") {
      // Delete activities typically indicate the actor's account has been deleted
      // Remove them from followers
      await prisma.activityPubArtistFollowers.deleteMany({
        where: {
          artistId: artist.id,
          actor: req.body.actor,
        },
      });
    }
    if (req.headers.accept) {
      res.set("content-type", "application/activity+json");
    }
    res.status(200);
    res.json({
      message: "success",
    });
  } catch (e) {
    const errorDetails = {
      error: e instanceof Error ? e.message : String(e),
      actor: req.body?.actor,
      type: req.body?.type,
      ...(e instanceof AppError && { httpCode: e.httpCode }),
    };

    // Log more details for signature verification failures
    if (e instanceof AppError && e.description?.includes("signature")) {
      log.warn(`ActivityPub signature verification failed:`, errorDetails);
    } else {
      log.error(`inboxPOST error:`, errorDetails);
    }
    next(e);
  }
};

export default inboxPOST;
