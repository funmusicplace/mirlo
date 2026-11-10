import { addSizesToStoredImage } from "../utils/artist";
import { FundraiserImageWithImage } from "../utils/fundraiser";
import { resolveFundraiserDescription } from "../utils/postContent";
import { videoEmbedUrl } from "../utils/videoEmbed";

import { processSingleTrackGroup } from "./trackGroup";
import { omitPrivateProfileFields, Serialized } from "./utils";

type FullTrackGroup = Parameters<typeof processSingleTrackGroup>[0];

export const serializeFundraiserImage = (
  fundraiserImage: FundraiserImageWithImage
) => ({
  ...addSizesToStoredImage(fundraiserImage.image),
  id: fundraiserImage.id,
  fundraiserId: fundraiserImage.fundraiserId,
  imageId: fundraiserImage.imageId,
  position: fundraiserImage.position,
});

const serializeFundraiserArtist = (profile: object) => {
  const { avatar, ...rest } = profile as {
    avatar?: Parameters<typeof addSizesToStoredImage>[0];
  };
  return {
    ...omitPrivateProfileFields(rest),
    ...(avatar !== undefined ? { avatar: addSizesToStoredImage(avatar) } : {}),
  };
};

export const serializeFundraiser = <T extends object>(
  fundraiser: T
): Serialized<T> => {
  const { trackGroups, images, profile, ...rest } = fundraiser as T & {
    profile?: object | null;
    trackGroups?: (Partial<FullTrackGroup> & {
      profile?: FullTrackGroup["profile"];
    })[];
    images?: FundraiserImageWithImage[];
    videoUrl?: string | null;
  };
  return {
    ...resolveFundraiserDescription(rest as { description?: string | null }),
    ...("videoUrl" in rest
      ? { videoEmbedUrl: videoEmbedUrl(rest.videoUrl) }
      : {}),
    ...(images !== undefined
      ? { images: images.map(serializeFundraiserImage) }
      : {}),
    ...(profile ? { artist: serializeFundraiserArtist(profile) } : {}),
    ...(trackGroups !== undefined
      ? {
          trackGroups: trackGroups.map((trackGroup) =>
            processSingleTrackGroup(trackGroup as FullTrackGroup)
          ),
        }
      : {}),
  } as Serialized<T>;
};

export const serializeFundraiserPledge = <T extends object>(
  pledge: T
): Serialized<T> => {
  const { fundraiser, ...rest } = pledge as T & {
    fundraiser?: object | null;
  };
  return {
    ...rest,
    ...(fundraiser !== undefined
      ? {
          fundraiser: fundraiser ? serializeFundraiser(fundraiser) : fundraiser,
        }
      : {}),
  } as Serialized<T>;
};
