import { TrackGroup, Post, Artist } from "@mirlo/prisma/client";

import RSS from "rss";

import { markdownAsHtml } from "./post";
import { isArtist, isPost, isTrackGroup } from "./typeguards";
import { getClient } from "../activityPub/utils";

export const turnItemsIntoRSS = async (
  feedDetails: {
    name: string;
    description?: string | null;
    apiEndpoint: string;
    clientUrl: string;
  },
  zipped: (
    | (TrackGroup & {
        artist: { name: string; urlSlug: string; id: number } | null;
      })
    | (Post & { artist: { name: string; urlSlug: string; id: number } | null })
    | Artist
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
    if (isTrackGroup(p)) {
      feed.item({
        title: p.title ?? "",
        description:
          p.about ?? `<h2>An album release by artist ${p.artist?.name}.</h2>`,
        url: `${client?.applicationUrl}/${p.artist?.urlSlug}/release/${p.urlSlug}`,
        date: p.releaseDate,
      });
    } else if (isPost(p)) {
      feed.item({
        title: p.title ?? "",
        description: markdownAsHtml(p.content),
        url: `${client?.applicationUrl}/${p.artist?.urlSlug}/post/${p.id}`,
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
