import { Track, TrackGroup, Post, Profile } from "@mirlo/prisma/client";
import RSS from "rss";

import { getClient } from "./getClient";
import { markdownAsHtml } from "./post";
import { isProfile, isPost, isTrack, isTrackGroup } from "./typeguards";

type FeedProfileRef = { name: string; urlSlug: string; id: number } | null;

type FeedTrackGroup = TrackGroup & {
  artist?: FeedProfileRef;
  profile?: FeedProfileRef;
};

type FeedTrack = Track & {
  trackGroup: FeedTrackGroup | null;
};

const feedProfile = (
  item: { artist?: FeedProfileRef; profile?: FeedProfileRef } | null | undefined
) => (item?.artist !== undefined ? item.artist : item?.profile);

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
    | (Post & {
        artist?: FeedProfileRef;
        profile?: FeedProfileRef;
      })
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
      const tgProfile = feedProfile(tg);
      const artistName = tgProfile?.name ?? "an artist";
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
          tg && tgProfile
            ? `${client?.applicationUrl}/${tgProfile.urlSlug}/release/${tg.urlSlug}/tracks/${p.id}`
            : `${client?.applicationUrl}/`,
        date: p.createdAt,
      });
    } else if (isTrackGroup(p)) {
      const profile = feedProfile(p);
      feed.item({
        title: p.title
          ? `${p.title} by ${profile?.name}`
          : `A release by ${profile?.name}`,
        description:
          p.about ?? `<h2>An release by artist ${profile?.name}.</h2>`,
        url: `${client?.applicationUrl}/${profile?.urlSlug}/release/${p.urlSlug}`,
        date: p.releaseDate ?? p.createdAt,
      });
    } else if (isPost(p)) {
      const profile = feedProfile(p);
      feed.item({
        title: p.title
          ? `${p.title} by ${profile?.name}`
          : `A post by ${profile?.name}`,
        description: markdownAsHtml(p.content),
        url: `${client?.applicationUrl}/${profile?.urlSlug}/posts/${p.id}`,
        date: p.publishedAt,
      });
    } else if (isProfile(p)) {
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
