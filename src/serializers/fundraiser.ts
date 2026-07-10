import { processSingleTrackGroup } from "./trackGroup";
import { Serialized } from "./utils";

type FullTrackGroup = Parameters<typeof processSingleTrackGroup>[0];

export const serializeFundraiser = <T extends object>(
  fundraiser: T
): Serialized<T> => {
  const { trackGroups, ...rest } = fundraiser as T & {
    trackGroups?: (Partial<FullTrackGroup> & {
      profile?: FullTrackGroup["profile"];
    })[];
  };
  return {
    ...rest,
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
