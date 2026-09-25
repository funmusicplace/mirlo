import { TRACK_GROUP_EXAMPLE } from "./trackGroup";

export const TRACK_EXAMPLE: Track = {
  id: 42,
  title: "Example Track",
  status: "preview",
  artistId: 1,
  trackGroupId: TRACK_GROUP_EXAMPLE.id,
  trackGroup: TRACK_GROUP_EXAMPLE,
  image: {} as Track["image"],
  order: 1,
  allowIndividualSale: true,
  description: "",
  minPrice: 0,
  metadata: {},
  isPreview: true,
  isPlayable: true,
  audio: {
    url: "",
    createdAt: "1999-09-09T09:09:09Z",
    duration: 184,
    uploadState: "SUCCESS",
    originalFilename: "example.wav",
  },
};

/**
 * A track uploaded straight into a post, which lands in the artist's hidden
 * drafts album rather than a real release.
 */
export const DRAFTS_ALBUM_TRACK_EXAMPLE: Track = {
  ...TRACK_EXAMPLE,
  id: 43,
  title: "Work in progress",
  trackGroupId: 99,
  trackGroup: {
    ...TRACK_GROUP_EXAMPLE,
    id: 99,
    title: "",
    urlSlug: "hidden-draft-album",
    isHiddenTrackGroupForSongDrafts: true,
    cover: undefined,
  },
};
