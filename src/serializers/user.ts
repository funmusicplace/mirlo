import { omitApPrivateKey, Serialized } from "./utils";

export const serializeUser = <T extends object>(user: T): Serialized<T> => {
  const { profiles, ...rest } = user as T & { profiles?: object[] };
  return {
    ...rest,
    ...(profiles !== undefined
      ? { artists: profiles.map(omitApPrivateKey) }
      : {}),
  } as Serialized<T>;
};
