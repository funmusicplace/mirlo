import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getInjectedArtist, getInjectedTrackGroup } from "utils/injectedData";
import { usePlayerSyncState } from "utils/playerSync";
import { isTrackOwnedOrPreview } from "utils/tracks";
import { isEmbeddedInMirlo } from "utils/widgetContext";

export const useTrackGroupWidgetData = () => {
  const params = useParams();
  const { user } = useAuthContext();
  const { currentTrack } = useCurrentTrackHook();

  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();
  const [artist, setArtist] = React.useState<Artist>();
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
        const injectedTrackGroup = getInjectedTrackGroup(params.id!);
        if (injectedTrackGroup) {
          setTrackGroup(injectedTrackGroup);
          const artistId = injectedTrackGroup.artistId;
          const injectedArtist = artistId
            ? getInjectedArtist(artistId)
            : undefined;
          if (injectedArtist) {
            setArtist(injectedArtist);
            return;
          }
        }
        const results = await api.get<TrackGroup>(`trackGroups/${params.id}`);
        setTrackGroup(results.result);
        const response = await api.get<Artist>(
          `artists/${results.result.artistId}`
        );
        setArtist(response.result);
      } catch (e) {
        console.error("e", e);
      } finally {
        setIsLoading(false);
      }
    };
    callback();
  }, [params.id]);

  const playableTracks = trackGroup?.tracks.filter((track) =>
    isTrackOwnedOrPreview(track, user, trackGroup)
  );

  return {
    trackGroup,
    artist,
    isLoading,
    user,
    currentTrack,
    currentSeconds,
    setCurrentSeconds,
    elapsedSeconds,
    embeddedInMirlo,
    playableTracks,
  };
};
