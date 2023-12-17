export const getArtistUrlReference = (artist: Artist) => {
  if (artist.urlSlug) {
    return artist.urlSlug;
  }
  return artist.id;
};

export const getTrackGroupUrlReference = (trackGroup: TrackGroup) => {
  if (trackGroup.urlSlug) {
    return trackGroup.urlSlug;
  }
  return trackGroup.id;
};
