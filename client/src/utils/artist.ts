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

export const getLabelWidget = (labelId: number) => {
  return `${import.meta.env.VITE_CLIENT_DOMAIN}/widget/label/${labelId}`;
};

export const getReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}`;
};

export const getManageReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `${getArtistManageUrl(artist.id)}/release/${trackGroup.id}`;
};

export const getTrackUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number },
  track: { id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}/tracks/${track.id}`;
};

export const getMerchUrl = (
  artist: { urlSlug?: string; id: number },
  merch: { id: string; urlSlug?: string | null }
) => {
  return `/${getArtistUrlReference(artist)}/merch/${merch.urlSlug ?? merch.id}`;
};

export const getPostURLReference = (post: Post) => {
  return post.artist
    ? `/${getArtistUrlReference(post.artist)}/posts/${post.urlSlug ?? post.id}/`
    : `/post/${post.id}`;
};

export const getManagePostURLReference = (post: Post) => {
  if (post.artistId) {
    return `${getArtistManageUrl(post.artistId)}/post/${post.id}/`;
  }
  return "";
};
