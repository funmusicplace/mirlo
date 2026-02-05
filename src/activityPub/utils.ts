import prisma from "@mirlo/prisma";
import {
  Artist,
  ArtistAvatar,
  ArtistBanner,
  ArtistUserSubscription,
  Post,
  TrackGroup,
} from "@mirlo/prisma/client";
import { AppError } from "../utils/error";
import crypto from "crypto";
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
  type: "accept" | "content-type"
) => {
  return (
    headers[type]?.includes("application/activity+json") ||
    headers[type]?.includes(
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    )
  );
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

export const turnFeedIntoOutbox = async (
  artist: Artist,
  feed: (
    | (TrackGroup & { artist: Artist })
    | (Post & { artist: Artist | null })
  )[]
) => {
  const client = await getClient();
  return {
    type: "OrderedCollection",
    totalItems: feed.length,
    id: `${rootArtist}${artist.urlSlug}/feed`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: feed.length,
      partOf: `${rootArtist}${artist.urlSlug}/feed`,
      orderedItems: feed.map((f) => {
        const actorId = `${rootArtist}${f.artist?.urlSlug}`;
        const isRelease = isTrackGroup(f);
        const noteId = isRelease
          ? `${rootArtist}${f.artist?.urlSlug}/trackGroups/${f.urlSlug}`
          : `${rootArtist}${f.artist?.urlSlug}/posts/${f.id}`;
        const noteUrl = isRelease
          ? `${client.applicationUrl}/${f.artist?.urlSlug}/releases/${f.urlSlug}`
          : `${client.applicationUrl}/${f.artist?.urlSlug}/posts/${f.id}`;
        const publishedAt = isRelease ? f.releaseDate : f.publishedAt;
        const note = {
          id: noteId,
          type: "Note",
          attributedTo: actorId,
          content: isRelease
            ? `<h2>A release by ${f.artist.name}.</h2>`
            : f.content,
          url: noteUrl,
          to: ["https://www.w3.org/ns/activitystreams#Public"],
          cc: [],
          published: publishedAt,
        };

        return {
          "@context": "https://www.w3.org/ns/activitystreams",
          id: `${noteId}#activity`, // Create activity needs a distinct id from the note itself
          type: "Create",
          actor: actorId,
          to: ["https://www.w3.org/ns/activitystreams#Public"],
          cc: [],
          published: publishedAt,
          object: note,
        };
      }),
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
