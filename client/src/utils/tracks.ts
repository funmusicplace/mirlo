import produce from "immer";
import api from "services/api";

import { CLIENT_ROOT } from "../constants";

import { canUserEditArtist } from "./artist";

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

export const sendToPlayableEndpoint = async (trackIds: number[]) => {
  const params = new URLSearchParams();
  for (const id of trackIds ?? []) {
    params.append("trackIds[]", id.toString());
  }
  const { results } = await api.getMany<number>(
    `playable?${params.toString()}`
  );
  return results;
};

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

export const isSingleTrackRelease = (trackGroup: {
  tracks?: unknown[] | null;
}) => trackGroup.tracks?.length === 1;

export const isTrackOwnedOrPreview = (
  track: Track,
  user?: LoggedInUser | null,
  trackGroup?: TrackGroup
): boolean => {
  if (track.isPreview) {
    return true;
  }
  if (!user) {
    return false;
  }
  const lookInTrackGroup = trackGroup ?? track.trackGroup;
  const ownsTrack = canUserEditArtist(user, {
    id: lookInTrackGroup.artistId ?? lookInTrackGroup.artist?.id,
    userId: lookInTrackGroup.artist?.userId,
  });
  if (ownsTrack) {
    return true;
  }
  if (lookInTrackGroup.isPreorder) {
    return false;
  }
  const boughtTrack = !!lookInTrackGroup.userTrackGroupPurchases?.find(
    (utgp) => utgp.userId === user.id
  );
  const boughtSingleTrack = !!user.userTrackPurchases?.some(
    (purchase) => purchase.trackId === track.id
  );
  return boughtTrack || boughtSingleTrack;
};

export const widgetPath = (trackId: number, type: "track" | "trackGroup") =>
  `/widget/${type}/${trackId}`;

export const widgetUrl = (trackId: number, type: "track" | "trackGroup") => {
  return CLIENT_ROOT + widgetPath(trackId, type);
};

export const isWidgetUrl = (url: string) => {
  const { host, pathname } = new URL(url);

  const hostArray = ["localhost:8080", "mirlo.space"];

  if (CLIENT_ROOT?.split("//")[1]) {
    hostArray.push(CLIENT_ROOT?.split("//")[1]);
  }
  const includesHost = hostArray.includes(host);
  const isWidget = pathname.includes("/widget");

  return includesHost && isWidget;
};
