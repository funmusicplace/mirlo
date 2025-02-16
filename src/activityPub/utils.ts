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
import { markdownAsHtml } from "../utils/post";
const { API_DOMAIN } = process.env;

export const artistsEndpoint = `${API_DOMAIN}/v1/artists/`;

export const getClient = async () => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  if (!client) {
    throw new AppError({
      httpCode: 500,
      description: "Server doesn't have a client",
    });
  }
  return client;
};

export const turnArtistIntoActor = async (
  artist: Artist & { avatar: ArtistAvatar | null; banner: ArtistBanner | null }
) => {
  const client = await getClient();
  let pubKey;
  if (!client.privateKey) {
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
      await prisma.client.update({
        where: {
          id: client.id,
        },
        data: {
          publicKey,
          privateKey,
        },
      });
      pubKey = publicKey;
    } catch (e) {
      console.error(e);
      throw new AppError({
        httpCode: 500,
        description: "Something went wrong generating the keys for the client",
      });
    }
  }

  const domain = client.applicationUrl;

  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],

    id: `${artistsEndpoint}${artist.urlSlug}`, // This is where someone can find this actor
    url: `${domain}/${artist.urlSlug}`, // This is the visible profile
    type: "Person",
    preferredUsername: `${artist.urlSlug}`,
    name: artist.name,
    summary: artist.bio,
    discoverable: artist.activityPub,
    inbox: `${artistsEndpoint}${artist.urlSlug}/inbox`,
    outbox: `${artistsEndpoint}${artist.urlSlug}/feed`,
    followers: `${artistsEndpoint}${artist.urlSlug}/followers`,
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
      id: `${artistsEndpoint}${artist.urlSlug}`,
      owner: `${artistsEndpoint}${artist.urlSlug}`,
      publicKeyPem: pubKey,
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
    id: `${artistsEndpoint}${artist.urlSlug}/outbox`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: feed.length,
      partOf: `${artistsEndpoint}${artist.urlSlug}/outbox`,
      orderedItems: feed.map((f) => ({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: f.id,
        type: "Note",
        content: isTrackGroup(f)
          ? `<h2>An album release by artist ${f.artist.name}.</h2>`
          : f.content,
        url: `${client.applicationUrl}/${f.artist?.urlSlug}/posts/${f.id}`,
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
      id: `${artistsEndpoint}${artist.urlSlug}/outbox?page=1`,
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
    id: `${artistsEndpoint}${artist.urlSlug}/followers`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: followers.length,
      partOf: `${artistsEndpoint}${artist.urlSlug}/followers`,
      orderedItems: [],
      id: `${artistsEndpoint}${artist.urlSlug}/followers?page=1`,
    },
    "@context": ["https://www.w3.org/ns/activitystreams"],
  };
};
