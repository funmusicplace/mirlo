import { createHmac, timingSafeEqual } from "crypto";

export const unfollowToken = (email: string, profileId: number) =>
  createHmac("sha256", process.env.JWT_SECRET ?? "")
    .update(`unfollow:${profileId}:${email.toLowerCase().trim()}`)
    .digest("hex");

export const isValidUnfollowToken = (
  token: string,
  email: string,
  profileId: number
) => {
  const expected = Buffer.from(unfollowToken(email, profileId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
};
