import { Track, TrackGroup, Post, Profile } from "@mirlo/prisma/client";
import RSS from "rss";

import { getClient } from "./getClient";
import { markdownAsHtml } from "./post";
import { isArtist, isPost, isTrack, isTrackGroup } from "./typeguards";

type FeedTrackGroup = TrackGroup & {
  artist: { name: string; urlSlug: string; id: number } | null;
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
    | (Post & { artist: { name: string; urlSlug: string; id: number } | null })
    | Profile
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
      feed.item({
        title: p.title
          ? `${p.title} by ${p.artist?.name}`
          : `A release by ${p.artist?.name}`,
        description:
          p.about ?? `<h2>An release by artist ${p.artist?.name}.</h2>`,
        url: `${client?.applicationUrl}/${p.artist?.urlSlug}/release/${p.urlSlug}`,
        date: p.releaseDate ?? p.createdAt,
      });
    } else if (isPost(p)) {
      feed.item({
        title: p.title
          ? `${p.title} by ${p.artist?.name}`
          : `A post by ${p.artist?.name}`,
        description: markdownAsHtml(p.content),
        url: `${client?.applicationUrl}/${p.artist?.urlSlug}/posts/${p.id}`,
        date: p.publishedAt,
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
