import { NextFunction, Request, Response } from "express";
import {
  headersAreForActivityPub,
  rootArtist,
  verifySignature,
  signAndSendActivityPubMessage,
} from "./utils";
import prisma from "@mirlo/prisma";
import crypto from "crypto";
import { AppError } from "../utils/error";
import { findArtistIdForURLSlug } from "../utils/artist";
import logger from "../logger";

async function sendAcceptMessage(
  thebody: { [key: string]: unknown },
  artistUrlSlug: string,
  targetDomain: string
) {
  const guid = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  let message = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${rootArtist}${artistUrlSlug}#activity-${guid}`,
    type: "Accept",
    actor: `${rootArtist}${artistUrlSlug}`,
    object: thebody,
    to: [thebody.actor],
    published: now.toISOString(),
  };
  const inboxUrl = thebody.actor + "/inbox";
  await signAndSendActivityPubMessage(
    message,
    artistUrlSlug,
    inboxUrl as string,
    targetDomain
  );
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

    await verifySignature(req, signatureHeader);

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
    if (!req.body.actor || !req.body.type) {
      throw new AppError({
        httpCode: 400,
        description: "Not a valid Activity",
      });
    }

    if (!["Follow", "Unfollow"].includes(req.body.type)) {
      throw new AppError({
        httpCode: 501,
        description: `${req.body.type} not implemented`,
      });
    }
    const remoteActorId = new URL(req.body.actor);
    const remoteActorDomain = remoteActorId.hostname;
    if (req.body.type === "Follow") {
      log.info(
        `inboxPOST: Processing Follow from ${req.body.actor} for artist ${artist.urlSlug}`
      );
      await sendAcceptMessage(req.body, artist.urlSlug, remoteActorDomain);
      // update followers
      const follower = await prisma.activityPubArtistFollowers.upsert({
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
      log.info(
        `inboxPOST: Follow registered successfully for ${req.body.actor} -> artist ${artist.id}`
      );
    }
    if (req.body.type === "Unfollow") {
      await sendAcceptMessage(req.body, artist.urlSlug, remoteActorDomain);
      // Remove from followers
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
    log.error(`inboxPOST error:`, e);
    next(e);
  }
};

export default inboxPOST;
