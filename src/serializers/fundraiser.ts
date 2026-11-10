import { addSizesToStoredImage } from "../utils/artist";
import { FundraiserImageWithImage } from "../utils/fundraiser";
import { resolveFundraiserDescription } from "../utils/postContent";

import { processSingleTrackGroup } from "./trackGroup";
import { Serialized } from "./utils";

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

export const serializeFundraiser = <T extends object>(
  fundraiser: T
): Serialized<T> => {
  const { trackGroups, images, ...rest } = fundraiser as T & {
    trackGroups?: (Partial<FullTrackGroup> & {
      profile?: FullTrackGroup["profile"];
    })[];
    images?: FundraiserImageWithImage[];
  };
  return {
    ...resolveFundraiserDescription(rest as { description?: string | null }),
    ...(images !== undefined
      ? { images: images.map(serializeFundraiserImage) }
      : {}),
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
