import { ProfileManager } from "@mirlo/prisma/client";

import { LocalProfile, serializeProfile } from "./artist";

type ProfileForList = Pick<LocalProfile, "id"> & Partial<LocalProfile>;

const serializePartialProfile = (profile: ProfileForList, userId?: number) =>
  serializeProfile(profile as LocalProfile, userId);

export const serializeManagedProfile = (
  profile: ProfileForList & Pick<LocalProfile, "userId">,
  loggedInUserId: number
) => ({
  ...serializePartialProfile(profile, loggedInUserId),
  relationship: profile.userId === loggedInUserId ? "owner" : "manager",
});

type ManagerWithUser = ProfileManager & {
  user: { id: number; name: string | null; email: string };
  invitedBy: { id: number; name: string | null };
};

export const serializeProfileManager = (
  manager: ManagerWithUser,
  { showEmail }: { showEmail: boolean }
) => {
  const { email, ...user } = manager.user;
  return {
    ...manager,
    user: showEmail ? { ...user, email } : user,
  };
};

type InviteWithProfile = ProfileManager & {
  profile: ProfileForList;
  invitedBy: { id: number; name: string | null };
};

/** A pending invite for the logged in user, with the artist as `artist`. */
export const serializeArtistInvite = (invite: InviteWithProfile) => {
  const { profile, ...rest } = invite;
  return { ...rest, artist: serializePartialProfile(profile) };
};
