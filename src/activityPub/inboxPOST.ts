import { NextFunction, Request, Response } from "express";
import {
  generateKeysForSiteIfNeeded,
  headersAreForActivityPub,
  root,
} from "./utils";
import prisma from "@mirlo/prisma";
import crypto from "crypto";
import { AppError } from "../utils/error";
import { findArtistIdForURLSlug } from "../utils/artist";

async function signAndSend(
  message: any,
  artistUrlSlug: string,
  destinationDomain: string
) {
  // get the URI of the actor object and append 'inbox' to it
  let destinationInbox = message.object.actor + "/inbox";
  let destinationInboxFragment = destinationInbox.replace(
    "https://" + destinationDomain,
    ""
  );
  // get the private key
  const { privateKey } = await generateKeysForSiteIfNeeded();

  if (privateKey) {
    const digestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(message))
      .digest("base64");
    const signer = crypto.createSign("sha256");
    let d = new Date();
    let stringToSign = `(request-target): post ${destinationInboxFragment}\nhost: ${destinationDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;
    signer.update(stringToSign);
    signer.end();
    const signature = signer.sign(privateKey);
    const signature_b64 = signature.toString("base64");
    let header = `keyId="${root}/${artistUrlSlug}",headers="(request-target) host date digest",signature="${signature_b64}"`;

    const requestBody = {
      url: destinationInbox,
      headers: {
        Host: destinationDomain,
        Date: d.toUTCString(),
        Digest: `SHA-256=${digestHash}`,
        Signature: header,
      },
      method: "POST",
      body: JSON.stringify(message),
    };

    try {
      const response = await fetch(requestBody.url, requestBody);
    } catch (e) {
      console.log("had an error", e);
    }
  }
}

async function sendAcceptMessage(
  thebody: { [key: string]: unknown },
  artistUrlSlug: string,
  targetDomain: string
) {
  const guid = crypto.randomBytes(16).toString("hex");
  let message = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${root}${guid}`,
    type: "Accept",
    actor: `${root}${artistUrlSlug}`,
    object: thebody,
  };
  await signAndSend(message, artistUrlSlug, targetDomain);
}

const inboxPOST = async (req: Request, res: Response, next: NextFunction) => {
  let { id }: { id?: string } = req.params;
  if (!id || id === "undefined") {
    return res.status(400);
  }

  try {
    if (!headersAreForActivityPub(req.headers, "content-type")) {
      throw new AppError({
        httpCode: 400,
        description: "Only accepts ActivityPub headers",
      });
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
    if (!req.body.actor || !req.body.type) {
      throw new AppError({
        httpCode: 400,
        description: "Not a valid Activity",
      });
    }

    if (!["Follow"].includes(req.body.type)) {
      throw new AppError({
        httpCode: 501,
        description: `${req.body.type} not implemented`,
      });
    }
    const remoteActorId = new URL(req.body.actor);
    const remoteActorDomain = remoteActorId.hostname;
    if (req.body.type === "Follow") {
      await sendAcceptMessage(req.body, artist.urlSlug, remoteActorDomain);
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
    }
    if (req.headers.accept) {
      res.set("content-type", "application/activity+json");
    }
    res.status(200);
    res.json({
      message: "success",
    });
  } catch (e) {
    next(e);
  }
};

export default inboxPOST;
