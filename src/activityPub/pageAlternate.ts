import prisma from "@mirlo/prisma";

import { matchRoute, splitPathIntoSegments } from "../parseIndex/routeMatcher";
import { whereForVisibleProfile } from "../utils/artist";

const apArtistUrl = (artistSlug: string) =>
  `${process.env.API_DOMAIN}/v1/ap/artists/${encodeURIComponent(artistSlug)}`;

export const findActivityPubAlternate = async (
  pathname: string
): Promise<string | null> => {
  const route = matchRoute(splitPathIntoSegments(pathname));
  if (!route) return null;

  const artistSlug = route.artistSlug as string | undefined;
  if (!artistSlug) return null;

  const profileWhere = {
    urlSlug: artistSlug,
    activityPub: true,
    ...whereForVisibleProfile(),
  };

  switch (route.type) {
    case "artist": {
      const artist = await prisma.profile.findFirst({
        where: profileWhere,
        select: { urlSlug: true },
      });
      return artist ? apArtistUrl(artist.urlSlug) : null;
    }
    case "post": {
      const post = await prisma.post.findFirst({
        where: {
          ...(route.postId
            ? { id: route.postId as number }
            : {
                urlSlug: {
                  equals: route.postSlug as string,
                  mode: "insensitive" as const,
                },
              }),
          isDraft: false,
          isPublic: true,
          profile: profileWhere,
        },
        select: { id: true },
      });
      return post ? `${apArtistUrl(artistSlug)}/posts/${post.id}` : null;
    }
    case "album": {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          urlSlug: route.albumSlug as string,
          isHiddenTrackGroupForSongDrafts: false,
          adminEnabled: true,
          profile: profileWhere,
        },
        select: { id: true },
      });
      return trackGroup
        ? `${apArtistUrl(artistSlug)}/releases/${trackGroup.id}`
        : null;
    }
    default:
      return null;
  }
};
