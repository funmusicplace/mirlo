import { omitApPrivateKey, Serialized } from "./utils";

export const serializeContentFlag = <T extends object>(
  flag: T
): Serialized<T> => {
  const { profileId, profile, ...rest } = flag as T & {
    profileId?: number | null;
    profile?: object | null;
  };

  return {
    ...rest,
    ...(profileId !== undefined ? { artistId: profileId } : {}),
    ...(profile !== undefined
      ? { artist: profile ? omitApPrivateKey(profile) : profile }
      : {}),
  } as Serialized<T>;
};
