import { Track, TrackGroup, Post, Profile } from "@mirlo/prisma/client";
import RSS from "rss";

import { getClient } from "./getClient";
import { markdownAsHtml } from "./post";
import { isArtist, isPost, isTrack, isTrackGroup } from "./typeguards";

type FeedArtistRef = { name: string; urlSlug: string; id: number } | null;

type FeedTrackGroup = Omit<TrackGroup, "profileId"> & {
  artistId?: number;
  artist: FeedArtistRef;
};

type FeedTrack = Track & {
  trackGroup: FeedTrackGroup | null;
};

export const turnItemsIntoRSS = async (
  feedDetails: {
    name: string;
    description?: string | null;
    apiEndpoint: string;
    clientUrl: string;
  },
  zipped: (
    | FeedTrackGroup
    | FeedTrack
    | (Omit<Post, "profileId"> & {
        artistId?: number;
        artist: FeedArtistRef;
      })
    | Omit<Profile, "apPrivateKey">
  )[]
) => {
  // TODO: probably want to convert this to some sort of module
  const client = await getClient();

  const feed = new RSS({
    title: `${feedDetails.name} Feed`,
    description: feedDetails.description ?? "",
    feed_url: `${process.env.API_DOMAIN}/v1/${feedDetails.apiEndpoint}?format=rss`,
    site_url: `${client?.applicationUrl}/${feedDetails.clientUrl}`,
  });

  for (const p of zipped) {
    if (isTrack(p)) {
      const tg = p.trackGroup;
      const artistName = tg?.artist?.name ?? "an artist";
      feed.item({
        title: p.title
          ? `${p.title} by ${artistName}`
          : `A track by ${artistName}`,
        description:
          p.description ??
          (tg?.title
            ? `A track from "${tg.title}" by ${artistName}.`
            : `A track by ${artistName}.`),
        url:
          tg && tg.artist
            ? `${client?.applicationUrl}/${tg.artist.urlSlug}/release/${tg.urlSlug}/tracks/${p.id}`
            : `${client?.applicationUrl}/`,
        date: p.createdAt,
      });
    } else if (isTrackGroup(p)) {
      const tg = p as FeedTrackGroup;
      feed.item({
        title: tg.title
          ? `${tg.title} by ${tg.artist?.name}`
          : `A release by ${tg.artist?.name}`,
        description:
          tg.about ?? `<h2>An release by artist ${tg.artist?.name}.</h2>`,
        url: `${client?.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}`,
        date: tg.releaseDate ?? tg.createdAt,
      });
    } else if (isPost(p)) {
      const post = p as Omit<Post, "profileId"> & {
        artistId?: number;
        artist: FeedArtistRef;
      };
      feed.item({
        title: post.title
          ? `${post.title} by ${post.artist?.name}`
          : `A post by ${post.artist?.name}`,
        description: markdownAsHtml(post.content),
        url: `${client?.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}`,
        date: post.publishedAt,
      });
    } else if (isArtist(p)) {
      feed.item({
        title: p.name,
        description: p.bio ?? `An artist on Mirlo`,
        url: `${client?.applicationUrl}/${p.urlSlug}`,
        date: new Date(),
      });
    }
  }
  return feed;
};
