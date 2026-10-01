import type { ArtistManager, ArtistManagerInvite } from "queries";

import { ARTIST_EXAMPLE } from "./artist";
import { USER_EXAMPLE } from "./user";

/** An artist owned by someone other than USER_EXAMPLE (id 1). */
export const SHARED_ARTIST_EXAMPLE: Artist = {
  ...ARTIST_EXAMPLE,
  id: 2,
  userId: 2,
  name: "The Borrowed Cabin",
  urlSlug: "the-borrowed-cabin",
};

export const ARTIST_MANAGER_EXAMPLE: ArtistManager = {
  profileId: ARTIST_EXAMPLE.id,
  userId: 3,
  acceptedAt: "2026-09-01T12:00:00Z",
  createdAt: "2026-08-30T12:00:00Z",
  user: { id: 3, name: "Sam Manager", email: "sam@example.com" },
  invitedBy: { id: 1, name: "Example User" },
};

/** USER_EXAMPLE (the logged in user in stories) managing SHARED_ARTIST_EXAMPLE. */
export const CURRENT_USER_AS_MANAGER_EXAMPLE: ArtistManager = {
  ...ARTIST_MANAGER_EXAMPLE,
  profileId: SHARED_ARTIST_EXAMPLE.id,
  userId: USER_EXAMPLE.id,
  user: {
    id: USER_EXAMPLE.id,
    name: USER_EXAMPLE.name,
    email: USER_EXAMPLE.email,
  },
};

export const PENDING_ARTIST_MANAGER_EXAMPLE: ArtistManager = {
  profileId: ARTIST_EXAMPLE.id,
  userId: 4,
  acceptedAt: null,
  createdAt: "2026-09-20T12:00:00Z",
  user: { id: 4, name: null, email: "pending@example.com" },
  invitedBy: { id: 1, name: "Example User" },
};

export const ARTIST_MANAGER_INVITE_EXAMPLE: ArtistManagerInvite = {
  profileId: SHARED_ARTIST_EXAMPLE.id,
  createdAt: "2026-09-20T12:00:00Z",
  artist: {
    id: SHARED_ARTIST_EXAMPLE.id,
    name: SHARED_ARTIST_EXAMPLE.name,
    urlSlug: SHARED_ARTIST_EXAMPLE.urlSlug,
  },
  invitedBy: { id: 2, name: "Robin Owner" },
};
