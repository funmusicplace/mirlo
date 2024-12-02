export const getArtistUrlReference = (artist: {
  urlSlug?: string;
  id?: number;
}) => {
  if (artist.urlSlug) {
    return `${artist.urlSlug.toLowerCase()}`;
  }
  return `${artist.id}`;
};

export const getTrackGroupUrlReference = (trackGroup: {
  urlSlug?: string;
  id: number;
}) => {
  if (!!trackGroup.urlSlug) {
    return trackGroup.urlSlug.toLowerCase();
  }
  return `${trackGroup.id}`;
};

export const getArtistUrl = (artist: { urlSlug?: string; id?: number }) => {
  return `/${getArtistUrlReference(artist)}`;
};

export const getArtistManageUrl = (artistId: number) => {
  return `/manage/artists/${artistId}`;
};

export const getArtistManageMerchUrl = (artistId: number, merchId: string) => {
  return `/manage/artists/${artistId}/merch/${merchId}`;
};

export const getTrackGroupWidget = (trackGroupId: number) => {
  return `${import.meta.env.VITE_CLIENT_DOMAIN}/widget/trackGroup/${trackGroupId}`;
};

export const getReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}`;
};

export const getMerchUrl = (
  artist: { urlSlug?: string; id: number },
  merch: { id: string }
) => {
  return `/${getArtistUrlReference(artist)}/merch/${merch.id}`;
};

export const getPostURLReference = (post: Post) => {
  return post.artist
    ? `/${getArtistUrlReference(post.artist)}/posts/${post.id}/`
    : `/post/${post.id}`;
};

export const getManagePostURLReference = (post: Post) => {
  if (post.artistId) {
    return `${getArtistManageUrl(post.artistId)}/post/${post.id}/`;
  }
  return "";
};
