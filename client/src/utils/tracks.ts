import produce from "immer";

export const determineNewTrackOrder = produce(
  (oldTracks: Track[], droppedInId: number, draggingTrackId: number) => {
    const dragIdx = oldTracks.findIndex(
      (track) => track.id === draggingTrackId
    );
    const dropIdx = oldTracks.findIndex((track) => track.id === droppedInId);
    const draggedItem = oldTracks.splice(dragIdx, 1);
    oldTracks.splice(dropIdx, 0, draggedItem[0]);
    return oldTracks;
  }
);

export const isEqualDurations = (n1: number, n2: number) => {
  return Math.abs(n1 - n2) < 0.00001;
};

export const fmtMSS = (s: number) => {
  return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s.toFixed(0);
};

export const isTrackOwnedOrPreview = (
  track: Track,
  user?: LoggedInUser,
  trackGroup?: TrackGroup
): boolean => {
  if (track.isPreview) {
    return true;
  }
  if (!user) {
    return false;
  }
  const lookInTrackGroup = trackGroup ?? track.trackGroup;
  const ownsTrack = lookInTrackGroup.artist?.userId === user.id;
  const boughtTrack = !!lookInTrackGroup.userTrackGroupPurchases?.find(
    (utgp) => utgp.userId === user.id
  );
  return ownsTrack || boughtTrack;
};

export const widgetUrl = (trackId: number) => {
  return process.env.REACT_APP_CLIENT_DOMAIN + `/widget/track/${trackId}`;
};
