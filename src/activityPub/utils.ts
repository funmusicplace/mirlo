import prisma from "@mirlo/prisma";
import { Request } from "express";
import {
  Artist,
  ArtistAvatar,
  ArtistBanner,
  ArtistUserSubscription,
  Post,
  TrackGroup,
} from "@mirlo/prisma/client";
import { AppError } from "../utils/error";
import crypto, { createVerify } from "crypto";
import {
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
} from "../utils/minio";
import { generateFullStaticImageUrl } from "../utils/images";
import { isTrackGroup } from "../utils/typeguards";
import { getSiteSettings } from "../utils/settings";
import { IncomingHttpHeaders } from "http";

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
  artist: Artist & { avatar: ArtistAvatar | null; banner: ArtistBanner | null }
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
    ...(artist.banner
      ? {
          image: {
            type: "Image",
            mediaType: "image/webp",
            url: generateFullStaticImageUrl(
              artist.banner.url[0],
              finalArtistBannerBucket
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
    name: post.title,
    url: noteUrl,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${actorId}/followers`],
    published: post.publishedAt?.toISOString(),
  };

  return {
    "@context": "https://www.w3.org/ns/activitystreams",
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

export async function fetchRemotePublicKey(keyId: string): Promise<string> {
  try {
    const response = await fetch(keyId, {
      headers: {
        Accept: "application/activity+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }

    const data = (await response.json()) as { publicKeyPem?: string };

    if (data.publicKeyPem) {
      return data.publicKeyPem;
    }

    throw new Error("No publicKeyPem found in actor document");
  } catch (e) {
    throw new AppError({
      httpCode: 401,
      description: `Failed to verify signature: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
  }
}

export const verifySignature = async (
  req: Request,
  signatureHeader: string
): Promise<boolean> => {
  // Parse signature header: keyId="...",headers="...",signature="..."
  const keyIdMatch = signatureHeader.match(/keyId="([^"]+)"/);
  const headersMatch = signatureHeader.match(/headers="([^"]+)"/);
  const signatureMatch = signatureHeader.match(/signature="([^"]+)"/);

  if (!keyIdMatch || !headersMatch || !signatureMatch) {
    throw new AppError({
      httpCode: 401,
      description: "Invalid signature header format",
    });
  }

  const keyId = keyIdMatch[1];
  const signedHeaders = headersMatch[1].split(" ");
  const signatureB64 = signatureMatch[1];

  // Get the public key from the remote actor
  const publicKey = await fetchRemotePublicKey(keyId);

  // Reconstruct the signed string
  let signedString = "";
  for (const headerName of signedHeaders) {
    if (headerName === "(request-target)") {
      const path = req.path;
      const method = req.method.toLowerCase();
      signedString += `(request-target): ${method} ${path}\n`;
    } else {
      const headerValue = req.headers[headerName.toLowerCase()];
      if (!headerValue) {
        throw new AppError({
          httpCode: 401,
          description: `Missing required header for signature: ${headerName}`,
        });
      }
      signedString += `${headerName}: ${headerValue}`;
      if (headerName !== signedHeaders[signedHeaders.length - 1]) {
        signedString += "\n";
      }
    }
  }

  // Verify the signature
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signedString);
  const signatureBuffer = Buffer.from(signatureB64, "base64");
  const isValid = verifier.verify(publicKey, signatureBuffer);

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

  const signer = crypto.createSign("sha256");
  const date = new Date();
  const stringToSign = `(request-target): post ${inboxPath}\nhost: ${destinationDomain}\ndate: ${date.toUTCString()}\ndigest: SHA-256=${digestHash}`;

  signer.update(stringToSign);
  signer.end();

  const signature = signer.sign(privateKey);
  const signature_b64 = signature.toString("base64");

  const header = `keyId="${rootArtist}${artistUrlSlug}#main-key",headers="(request-target) host date digest",signature="${signature_b64}"`;

  const response = await fetch(inboxUrl, {
    method: "POST",
    headers: {
      Host: destinationDomain,
      Date: date.toUTCString(),
      Digest: `SHA-256=${digestHash}`,
      Signature: header,
      "Content-Type": "application/activity+json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to deliver to ${inboxUrl}: ${response.status} ${errorText}`
    );
  }

  return response;
};
