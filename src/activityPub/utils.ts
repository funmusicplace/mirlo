import crypto from "crypto";
import { IncomingHttpHeaders } from "http";

import prisma from "@mirlo/prisma";
import {
  Artist,
  ArtistAvatar,
  ArtistBackground,
  ArtistUserSubscription,
  Post,
  TrackGroup,
} from "@mirlo/prisma/client";
import { Request } from "express";
import httpSignature from "http-signature";

import { logger } from "../logger";
import { AppError } from "../utils/error";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
} from "../utils/minio";
import { getSiteSettings } from "../utils/settings";
import { isTrackGroup } from "../utils/typeguards";

import {
  fetchActivityPubDocument,
  ACTIVITYPUB_ACCEPT_HEADER,
  sendSignedActivityPubMessage,
} from "./httpClient";

const { REACT_APP_CLIENT_DOMAIN } = process.env;

export const root = new URL(REACT_APP_CLIENT_DOMAIN || "http://localhost:3000")
  .hostname;

export const rootArtist = `https://${root}/v1/artists/`;

export const generateKeysForSiteIfNeeded = async () => {
  const settings = await getSiteSettings();
  const { publicKey } = settings;
  if (!publicKey) {
    try {
      // instead of storing a private key for each user, we do this for the client
      // people seem to think this is fine https://socialhub.activitypub.rocks/t/how-i-saved-gigabytes-by-deleting-all-rsa-keys/3983
      // If this client doesn't have a privateKey yet,
      // we'll generate one and store it. This should only happen once.
      const { publicKey, privateKey } = await crypto.generateKeyPairSync(
        "rsa",
        {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
          },
        }
      );
      await prisma.settings.update({
        where: {
          id: settings.id,
        },
        data: {
          publicKey,
          privateKey,
        },
      });
    } catch (e) {
      console.error(e);
      throw new AppError({
        httpCode: 500,
        description: "Something went wrong generating the keys for the app",
      });
    }
  }

  return await getSiteSettings();
};

export const headersAreForActivityPub = (
  headers: IncomingHttpHeaders,
  method: "POST" | "GET" | "PUT" | "DELETE"
) => {
  const contentType = headers["content-type"];
  const accept = headers["accept"];

  const isActivityPubMimeType = (header: string | undefined) =>
    header?.includes("application/activity+json") ||
    header?.includes(
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    );

  // POST/PUT check Content-Type (what's being sent)
  // All methods can check Accept (what format is wanted back)
  if (method === "POST" || method === "PUT") {
    return isActivityPubMimeType(contentType) || isActivityPubMimeType(accept);
  }

  // GET/DELETE check Accept header
  return isActivityPubMimeType(accept);
};

export const getClient = async () => {
  let client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        applicationName: "frontend",
        applicationUrl: "http://localhost:8080",
      },
    });
  }
  return client;
};

export const turnArtistIntoActor = async (
  artist: Artist & {
    avatar: ArtistAvatar | null;
    background: ArtistBackground | null;
  }
) => {
  const client = await getClient();
  const { publicKey } = await generateKeysForSiteIfNeeded();
  const domain = client.applicationUrl;

  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],

    id: `${rootArtist}${artist.urlSlug}`, // This is where someone can find this actor
    url: `${domain}/${artist.urlSlug}`, // This is the visible profile
    type: "Person",
    preferredUsername: `${artist.urlSlug}`,
    name: artist.name,
    summary: artist.bio,
    discoverable: artist.activityPub,
    inbox: `${rootArtist}${artist.urlSlug}/inbox`,
    outbox: `${rootArtist}${artist.urlSlug}/feed`,
    followers: `${rootArtist}${artist.urlSlug}/followers`,
    ...(artist.avatar
      ? {
          icon: {
            type: "Image",
            mediaType: "image/webp",
            url: generateFullStaticImageUrl(
              artist.avatar.url[0],
              finalArtistAvatarBucket
            ),
          },
        }
      : {}),
    ...(artist.background
      ? {
          image: {
            type: "Image",
            mediaType: "image/webp",
            url: generateFullStaticImageUrl(
              artist.background.url[0],
              finalArtistBackgroundBucket
            ),
          },
        }
      : {}),
    publicKey: {
      id: `${rootArtist}${artist.urlSlug}#main-key`,
      owner: `${rootArtist}${artist.urlSlug}`,
      publicKeyPem: publicKey,
    },
  };
};

export const createPostActivity = async (
  post: Pick<Post, "id" | "urlSlug" | "content" | "title" | "publishedAt">,
  artist: Pick<Artist, "urlSlug">,
  activityIdSuffix?: string
) => {
  const client = await getClient();
  const actorId = `${rootArtist}${artist.urlSlug}`;
  const noteId = `${rootArtist}${artist.urlSlug}/posts/${post.urlSlug || post.id}`;
  const noteUrl = `${client.applicationUrl}/${artist.urlSlug}/posts/${post.urlSlug || post.id}`;

  const note = {
    id: noteId,
    type: "Note",
    attributedTo: actorId,
    content: post.content,
    mediaType: "text/html",
    name: post.title,
    url: noteUrl,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${actorId}/followers`],
    published: post.publishedAt?.toISOString(),
  };

  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: `${noteId}#activity${activityIdSuffix ? `-${activityIdSuffix}` : ""}`,
    type: "Create",
    actor: actorId,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${actorId}/followers`],
    published: post.publishedAt?.toISOString(),
    object: note,
  };
};

export const createTrackGroupActivity = async (
  trackGroup: Pick<TrackGroup, "urlSlug" | "releaseDate">,
  artist: Pick<Artist, "urlSlug" | "name">,
  activityIdSuffix?: string
) => {
  const client = await getClient();
  const actorId = `${rootArtist}${artist.urlSlug}`;
  const noteId = `${rootArtist}${artist.urlSlug}/trackGroups/${trackGroup.urlSlug}`;
  const noteUrl = `${client.applicationUrl}/${artist.urlSlug}/releases/${trackGroup.urlSlug}`;

  const note = {
    id: noteId,
    type: "Note",
    attributedTo: actorId,
    content: `<h2>A release by ${artist.name}.</h2>`,
    url: noteUrl,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [],
    published: trackGroup.releaseDate?.toISOString(),
  };

  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${noteId}#activity${activityIdSuffix ? `-${activityIdSuffix}` : ""}`,
    type: "Create",
    actor: actorId,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [],
    published: trackGroup.releaseDate?.toISOString(),
    object: note,
  };
};

export const turnFeedIntoOutbox = async (
  artist: Artist,
  feed: (
    | (TrackGroup & { artist: Artist })
    | (Post & { artist: Artist | null })
  )[]
) => {
  const client = await getClient();

  const orderedItems = await Promise.all(
    feed.map(async (f) => {
      const isRelease = isTrackGroup(f);

      if (!isRelease && f.artist) {
        // Use createPostActivity for posts
        const activity = await createPostActivity(f as Post, f.artist);
        // Override to match outbox format (no activity suffix)
        activity.id = `${activity.id.split("#")[0]}#activity`;
        return activity;
      } else if (isRelease && f.artist) {
        // Use createTrackGroupActivity for releases
        const activity = await createTrackGroupActivity(
          f as TrackGroup,
          f.artist
        );
        return activity;
      }

      // Fallback (shouldn't happen)
      throw new Error(`Feed item has no artist: ${f.id}`);
    })
  );

  return {
    type: "OrderedCollection",
    totalItems: feed.length,
    id: `${rootArtist}${artist.urlSlug}/feed`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: feed.length,
      partOf: `${rootArtist}${artist.urlSlug}/feed`,
      orderedItems,
      id: `${rootArtist}${artist.urlSlug}/feed?page=1`,
    },
    "@context": ["https://www.w3.org/ns/activitystreams"],
  };
};

export const turnSubscribersIntoFollowers = (
  artist: Artist,
  followers: ArtistUserSubscription[]
) => {
  return {
    type: "OrderedCollection",
    totalItems: followers.length,
    id: `${rootArtist}${artist.urlSlug}/followers`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: followers.length,
      partOf: `${rootArtist}${artist.urlSlug}/followers`,
      orderedItems: [],
      id: `${rootArtist}${artist.urlSlug}/followers?page=1`,
    },
    "@context": ["https://www.w3.org/ns/activitystreams"],
  };
};

const parsePublicKeyFromActorDoc = (
  data: any,
  expectedKeyId: string
): string | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (typeof data.publicKeyPem === "string") {
    return data.publicKeyPem;
  }

  if (
    data.publicKey &&
    typeof data.publicKey === "object" &&
    typeof data.publicKey.publicKeyPem === "string"
  ) {
    if (!data.publicKey.id || data.publicKey.id === expectedKeyId) {
      return data.publicKey.publicKeyPem;
    }
  }

  if (Array.isArray(data.publicKey)) {
    const matchingPublicKey = data.publicKey.find(
      (pk: any) =>
        pk?.id === expectedKeyId && typeof pk?.publicKeyPem === "string"
    );
    if (matchingPublicKey?.publicKeyPem) {
      return matchingPublicKey.publicKeyPem;
    }

    const firstValidPublicKey = data.publicKey.find(
      (pk: any) => typeof pk?.publicKeyPem === "string"
    );
    if (firstValidPublicKey?.publicKeyPem) {
      return firstValidPublicKey.publicKeyPem;
    }
  }

  return null;
};

// Simple in-memory cache for public keys to avoid repeated fetches
const publicKeyCache = new Map<string, { key: string; timestamp: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

const getErrorStatusCode = (error: unknown): number | null => {
  if (error && typeof error === "object" && "response" in error) {
    return (error as any).response?.statusCode ?? null;
  }
  return null;
};

const buildHttpSignatureHeader = async (
  method: "get" | "post",
  path: string,
  keyId: string,
  privateKey: string,
  headers: Array<[string, string]>
) => {
  const signer = httpSignature.createSigner({
    keyId,
    key: privateKey,
  });

  signer.writeTarget(method, path);
  for (const [headerName, headerValue] of headers) {
    signer.writeHeader(headerName, headerValue);
  }

  const authorization = await new Promise<string>((resolve, reject) => {
    signer.sign((error, value) => {
      if (error || !value) {
        reject(error ?? new Error("Failed to sign ActivityPub request"));
        return;
      }
      resolve(value);
    });
  });

  return authorization.replace(/^Signature\s+/i, "");
};

const fetchActivityPubDocumentWithSignedRetry = async (
  url: string,
  localActorUrlSlug?: string
) => {
  try {
    return await fetchActivityPubDocument(url);
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    if (statusCode !== 401 || !localActorUrlSlug) {
      throw error;
    }

    logger.info(
      `Got 401 fetching ${url}, retrying with signed GET using local actor ${localActorUrlSlug}`
    );

    const { privateKey } = await generateKeysForSiteIfNeeded();
    if (!privateKey) {
      throw new Error("No private key available for signed ActivityPub fetch");
    }

    const targetUrl = new URL(url);
    const targetHost = targetUrl.hostname;
    const targetPath = `${targetUrl.pathname}${targetUrl.search}`;
    const date = new Date().toUTCString();

    const signatureHeader = await buildHttpSignatureHeader(
      "get",
      targetPath,
      `${rootArtist}${localActorUrlSlug}#main-key`,
      privateKey,
      [
        ["host", targetHost],
        ["date", date],
        ["accept", ACTIVITYPUB_ACCEPT_HEADER],
      ]
    );

    return await fetchActivityPubDocument(url, {
      Host: targetHost,
      Date: date,
      Accept: ACTIVITYPUB_ACCEPT_HEADER,
      Signature: signatureHeader,
    });
  }
};

export async function fetchRemotePublicKey(
  keyId: string,
  localActorUrlSlug?: string
): Promise<string> {
  try {
    // Check cache first
    const cached = publicKeyCache.get(keyId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      logger.debug(`Public key cache hit for ${keyId}`);
      return cached.key;
    }

    let data: Record<string, any>;

    try {
      // Try the keyId first (might have a fragment like #main-key)
      data = await fetchActivityPubDocumentWithSignedRetry(
        keyId,
        localActorUrlSlug
      );
    } catch (error) {
      // Some servers return 404 for keyId URLs with fragments (e.g. actor#main-key).
      // Fallback to the actor document and extract the key from there.
      if (keyId.includes("#")) {
        const actorUrl = keyId.split("#")[0];
        logger.info(
          `Got error for ${keyId}, trying without fragment: ${actorUrl}`
        );
        data = await fetchActivityPubDocumentWithSignedRetry(
          actorUrl,
          localActorUrlSlug
        );
      } else {
        throw error;
      }
    }

    const publicKeyPem = parsePublicKeyFromActorDoc(data, keyId);

    if (publicKeyPem) {
      // Cache the successful fetch
      publicKeyCache.set(keyId, { key: publicKeyPem, timestamp: Date.now() });
      return publicKeyPem;
    }

    throw new Error("No publicKeyPem found in actor document");
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";

    // Don't log 410 Gone errors; they're expected and inboxPOST handles them
    if (!errorMsg.includes("Gone")) {
      logger.error(`Error fetching public key for ${keyId}: ${errorMsg}`);
    }

    throw new AppError({
      httpCode: 401,
      description: `Failed to verify signature: ${errorMsg}`,
    });
  }
}

export const verifySignature = async (
  req: Request,
  signatureHeader: string,
  localActorUrlSlug?: string
): Promise<boolean> => {
  if (!signatureHeader) {
    throw new AppError({
      httpCode: 401,
      description: "Invalid signature header format",
    });
  }

  let parsedSignature;
  try {
    const requestForParsing = {
      ...req,
      headers: {
        ...req.headers,
        authorization: `Signature ${signatureHeader}`,
      },
    };

    parsedSignature = httpSignature.parseRequest(requestForParsing as any);
  } catch (e) {
    throw new AppError({
      httpCode: 401,
      description: "Invalid signature header format",
    });
  }

  const keyId = parsedSignature?.params?.keyId;
  if (!keyId) {
    throw new AppError({
      httpCode: 401,
      description: "Invalid signature header format",
    });
  }

  // Get the public key from the remote actor
  // Don't catch here; let errors bubble up to inboxPOST for handling
  const publicKey = await fetchRemotePublicKey(keyId, localActorUrlSlug);

  const isValid = httpSignature.verifySignature(parsedSignature, publicKey);

  if (!isValid) {
    throw new AppError({
      httpCode: 401,
      description: "Signature verification failed",
    });
  }

  return true;
};

/**
 * Sign and send an ActivityPub message to a specific inbox
 * Used for both Accept messages and post delivery
 */
export const signAndSendActivityPubMessage = async (
  message: any,
  artistUrlSlug: string,
  inboxUrl: string,
  destinationDomain: string
) => {
  const { privateKey } = await generateKeysForSiteIfNeeded();

  if (!privateKey) {
    throw new Error("No private key available for signing");
  }

  const inboxPath = new URL(inboxUrl).pathname;

  const digestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(message))
    .digest("base64");

  const date = new Date();
  const header = await buildHttpSignatureHeader(
    "post",
    inboxPath,
    `${rootArtist}${artistUrlSlug}#main-key`,
    privateKey,
    [
      ["host", destinationDomain],
      ["date", date.toUTCString()],
      ["digest", `SHA-256=${digestHash}`],
    ]
  );

  await sendSignedActivityPubMessage(inboxUrl, message, {
    Date: date.toUTCString(),
    Digest: `SHA-256=${digestHash}`,
    Signature: header,
  });
};
