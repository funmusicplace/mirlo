export const getArtistUrlReference = (artist: Artist) => {
  if (artist.urlSlug) {
    return artist.urlSlug.toLowerCase();
  }
  return `${artist.id}`;
};

export const getTrackGroupUrlReference = (trackGroup: TrackGroup) => {
  if (!!trackGroup.urlSlug) {
    return trackGroup.urlSlug.toLowerCase();
  }
  return `${trackGroup.id}`;
};

export const getReleaseUrl = (artist: Artist, trackGroup: TrackGroup) => {
  return `/${getArtistUrlReference(artist)}/release/${getTrackGroupUrlReference(
    trackGroup
  )}`;
};

export const getPostURLReference = (post: Post) => {
  return post.artist
    ? `/${getArtistUrlReference(post.artist)}/posts/${post.id}/`
    : `/post/${post.id}`;
};
