import { createHmac, timingSafeEqual } from "crypto";

export const unfollowToken = (email: string, profileId: number) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set to sign unsubscribe links");
  }
  return createHmac("sha256", secret)
    .update(`unfollow:${profileId}:${email.toLowerCase().trim()}`)
    .digest("hex");
};

export const isValidUnfollowToken = (
  token: string,
  email: string,
  profileId: number
) => {
  const expected = Buffer.from(unfollowToken(email, profileId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
};
