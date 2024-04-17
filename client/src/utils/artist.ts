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

export const getTrackGroupWidget = (trackGroupId: number) => {
  return `${process.env.REACT_APP_CLIENT_DOMAIN}/widget/trackGroup/${trackGroupId}`;
};

export const getReleaseUrl = (
  artist: { urlSlug?: string; id: number },
  trackGroup: { urlSlug?: string; id: number }
) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}`;
};

export const getPostURLReference = (post: Post) => {
  return post.artist
    ? `/${getArtistUrlReference(post.artist)}/posts/${post.id}/`
    : `/post/${post.id}`;
};
