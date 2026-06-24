import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

export const usePostWidgetData = () => {
  const params = useParams();
  const { currentTrack } = useCurrentTrackHook();
  const [post, setPost] = React.useState<Post>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);

  const embeddedInMirlo = isEmbeddedInMirlo();
  const playerSyncState = usePlayerSyncState();
  const playableTracks = post?.tracks?.filter((t) => t.isPlayable);
  const ownTrackIds = new Set(playableTracks?.map((t) => t.trackId) ?? []);
  const syncedTrackId = playerSyncState?.currentTrackId ?? null;
  const hasSyncedTrack =
    syncedTrackId !== null && ownTrackIds.has(syncedTrackId);
  const scopedCurrentTrack =
    embeddedInMirlo && (!hasSyncedTrack || currentTrack?.id !== syncedTrackId)
      ? undefined
      : currentTrack;
  const elapsedSeconds = embeddedInMirlo
    ? hasSyncedTrack
      ? (playerSyncState?.currentSeconds ?? 0)
      : 0
    : currentSeconds;

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const result = await api.get<Post>(`posts/${params.id}`);
        setPost(result.result);
      } catch (e) {
        console.error("PostWidget fetch error", e);
      } finally {
        setIsLoading(false);
      }
    };
    callback();
  }, [params.id]);

  return {
    post,
    isLoading,
    currentTrack: scopedCurrentTrack,
    currentSeconds,
    setCurrentSeconds,
    elapsedSeconds,
    embeddedInMirlo,
    playableTracks,
  };
};
