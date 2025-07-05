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

export const fmtMSS = (sec_num: number) => {
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor(sec_num / 60) % 60;
  const seconds = Math.floor(sec_num % 60);

  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

export const isTrackOwnedOrPreview = (
  track: Track,
  user?: LoggedInUser | null,
  trackGroup?: TrackGroup
): boolean => {
  if (track.isPreview) {
    return true;
  }
  if (
    trackGroup?.releaseDate &&
    new Date(trackGroup.releaseDate) > new Date()
  ) {
    return false;
  }
  if (!user) {
    return false;
  }
  const lookInTrackGroup = trackGroup ?? track.trackGroup;
  const ownsTrack = lookInTrackGroup.artist?.id === user.id;
  const boughtTrack = !!lookInTrackGroup.userTrackGroupPurchases?.find(
    (utgp) => utgp.userId === user.id
  );
  return ownsTrack || boughtTrack;
};

export const widgetUrl = (trackId: number, type: "track" | "trackGroup") => {
  return import.meta.env.VITE_CLIENT_DOMAIN + `/widget/${type}/${trackId}`;
};

export const isWidgetUrl = (url: string) => {
  const { host, pathname } = new URL(url);

  const hostArray = ["localhost:8080", "mirlo.space"];

  if (import.meta.env.VITE_CLIENT_DOMAIN?.split("//")[1]) {
    hostArray.push(import.meta.env.VITE_CLIENT_DOMAIN?.split("//")[1]);
  }
  const includesHost = hostArray.includes(host);
  const isWidget = pathname.includes("/widget");

  return includesHost && isWidget;
};
