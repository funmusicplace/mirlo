import {
  Track,
  TrackArtist,
  TrackGroup,
  Post,
  Profile,
} from "@mirlo/prisma/client";
import { escape } from "lodash";
import RSS from "rss";

import { getClient } from "./getClient";
import { markdownAsHtml } from "./post";
import {
  ReleaseArtistRow,
  releaseArtistText,
  trackArtistTextForRelease,
} from "./releaseArtists";
import { isArtist, isPost, isTrack, isTrackGroup } from "./typeguards";

type FeedArtistRef = { name: string; urlSlug: string; id: number } | null;

type FeedTrackGroup = Omit<TrackGroup, "profileId"> & {
  artistId?: number;
  artist: FeedArtistRef;
  tags?: string[];
  trackGroupArtists?: ReleaseArtistRow[];
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
    imageUrl?: string | null;
    instanceName: string;
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
    ...(feedDetails.imageUrl ? { image_url: feedDetails.imageUrl } : {}),
  });

  for (const p of zipped) {
    if (isTrack(p)) {
      const tg = p.trackGroup;
      const feedReleaseArtists =
        (tg as FeedTrackGroup | undefined)?.trackGroupArtists ?? [];
      const feedOwnerName = tg?.artist?.name ?? "an artist";
      const artistName = trackArtistTextForRelease(
        (p as { trackArtists?: TrackArtist[] }).trackArtists ?? [],
        feedReleaseArtists,
        { name: feedOwnerName }
      );
      feed.item({
        title: p.title
          ? `${p.title} by ${artistName}`
          : `A track by ${artistName}`,
        description: p.description
          ? markdownAsHtml(p.description)
          : tg?.title
            ? `A track from "${escape(tg.title)}" by ${escape(artistName)}.`
            : `A track by ${escape(artistName)}.`,
        url:
          tg && tg.artist
            ? `${client?.applicationUrl}/${tg.artist.urlSlug}/release/${tg.urlSlug}/tracks/${p.id}`
            : `${client?.applicationUrl}/`,
        date: p.createdAt,
        categories: tg?.tags ?? [],
      });
    } else if (isTrackGroup(p)) {
      const tg = p as FeedTrackGroup;
      const releaseArtistName = releaseArtistText(tg.trackGroupArtists ?? [], {
        name: tg.artist?.name,
      });
      feed.item({
        title: tg.title
          ? `${tg.title} by ${releaseArtistName}`
          : `A release by ${releaseArtistName}`,
        description: tg.about
          ? markdownAsHtml(tg.about)
          : `<h2>A release by artist ${escape(releaseArtistName)}.</h2>`,
        url: `${client?.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}`,
        date: tg.releaseDate ?? tg.createdAt,
        categories: tg.tags ?? [],
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
        description: p.bio
          ? markdownAsHtml(p.bio)
          : `An artist on ${feedDetails.instanceName}`,
        url: `${client?.applicationUrl}/${p.urlSlug}`,
        date: new Date(),
      });
    }
  }
  return feed;
};
