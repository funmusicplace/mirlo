import { Profile } from "@mirlo/prisma/client";

import { serializeProfileUserSubscription } from "./profileUserSubscription";
import { omitApPrivateKey } from "./utils";

export interface LocalArtistLabel {
  artistId: number;
  artist?: Profile;
  labelUserId: number;
  labelUser?: {
    profiles?: Profile[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const serializeArtistLabel = (
  al: LocalArtistLabel,
  userId?: number,
  isUserSubscriber?: boolean
): Record<string, unknown> => {
  const { artistId, artist, labelUser, ...rest } = al;
  const { profiles, profileUserSubscriptions, ...labelUserRest } = (labelUser ??
    {}) as {
    profiles?: Profile[];
    profileUserSubscriptions?: Parameters<
      typeof serializeProfileUserSubscription
    >[0][];
    [key: string]: unknown;
  };
  // Lazy require avoids a circular import with artist.ts (processSingleArtist
  // calls serializeArtistLabel).
  const { processSingleArtist } =
    require("./artist") as typeof import("./artist");
  return {
    ...rest,
    artistId,
    artist: artist ? omitApPrivateKey(artist) : undefined,
    labelUser: labelUser
      ? {
          ...labelUserRest,
          artists: profiles?.map((labelProfile) =>
            processSingleArtist(labelProfile, userId, isUserSubscriber)
          ),
          ...(profileUserSubscriptions !== undefined
            ? {
                artistUserSubscriptions: profileUserSubscriptions.map((sub) =>
                  serializeProfileUserSubscription(sub)
                ),
              }
            : {}),
        }
      : undefined,
  };
};
