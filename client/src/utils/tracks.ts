import produce from "immer";
// import { API, getToken } from "../services/Api";

export function buildHLSURL(id: number, loggedInUser: boolean): string {
  // We assume we're using full OIDC
  // if (loggedInUser) {
  //   return `${API}user/stream/${id}/playlist.m3u8`;
  // }
  // return `${API}stream/${id}`;
  return "";
}

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
  return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
};
