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
  const elapsedSeconds = embeddedInMirlo
    ? (playerSyncState?.currentSeconds ?? 0)
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

  const playableTracks = post?.tracks?.filter((t) => t.isPlayable);

  return {
    post,
    isLoading,
    currentTrack,
    currentSeconds,
    setCurrentSeconds,
    elapsedSeconds,
    embeddedInMirlo,
    playableTracks,
  };
};
