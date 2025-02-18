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
const { API_DOMAIN } = process.env;

export const root = `${API_DOMAIN}/v1/artists/`.replace("api.", "");

export const generateKeysForSiteIfNeeded = async () => {
  const settings = await getSiteSettings();
  console.log("got site settings", settings);
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
      console.log("id", settings.id);
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

export const headersAreForActivityPub = (headers: IncomingHttpHeaders) => {
  return (
    headers["accept"] === "application/activity+json" ||
    headers["accept"]?.includes(
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

    id: `${root}${artist.urlSlug}`, // This is where someone can find this actor
    url: `${domain}/${artist.urlSlug}`, // This is the visible profile
    type: "Person",
    preferredUsername: `${artist.urlSlug}`,
    name: artist.name,
    summary: artist.bio,
    discoverable: artist.activityPub,
    inbox: `${root}${artist.urlSlug}/inbox`,
    outbox: `${root}${artist.urlSlug}/feed`,
    followers: `${root}${artist.urlSlug}/followers`,
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
      id: `${root}${artist.urlSlug}#main-key`,
      owner: `${root}${artist.urlSlug}`,
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
    id: `${root}${artist.urlSlug}/feed`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: feed.length,
      partOf: `${root}${artist.urlSlug}/feed`,
      orderedItems: feed.map((f) => ({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: isTrackGroup(f)
          ? `${root}${f.artist?.urlSlug}/trackGroups/${f.urlSlug}`
          : `${root}${f.artist?.urlSlug}/posts/${f.id}`,
        type: "Note",
        content: isTrackGroup(f)
          ? `<h2>An album release by artist ${f.artist.name}.</h2>`
          : f.content,
        url: isTrackGroup(f)
          ? `${client.applicationUrl}/${f.artist?.urlSlug}/releases/${f.urlSlug}`
          : `${client.applicationUrl}/${f.artist?.urlSlug}/posts/${f.id}`,
        attributedTo: `${client.applicationUrl}/${f.artist?.urlSlug}`,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [],
        published: isTrackGroup(f) ? f.releaseDate : f.publishedAt,
        // TODO: Should we allow replies?
        // replies: {
        //   id: "https://maho.dev/socialweb/replies/1dff22b5faf3fbebc5aaf2bb5b5dbe2c",
        //   type: "Collection",
        //   first: {
        //     type: "CollectionPage",
        //     next: "https://maho.dev/socialweb/replies/1dff22b5faf3fbebc5aaf2bb5b5dbe2c?page=true",
        //     partOf:
        //       "https://maho.dev/socialweb/replies/1dff22b5faf3fbebc5aaf2bb5b5dbe2c",
        //     items: [],
        //   },
        // },
      })),
      id: `${root}${artist.urlSlug}/feed?page=1`,
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
    id: `${root}${artist.urlSlug}/followers`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: followers.length,
      partOf: `${root}${artist.urlSlug}/followers`,
      orderedItems: [],
      id: `${root}${artist.urlSlug}/followers?page=1`,
    },
    "@context": ["https://www.w3.org/ns/activitystreams"],
  };
};
