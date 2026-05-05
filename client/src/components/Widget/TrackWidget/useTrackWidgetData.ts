import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

export const useTrackWidgetData = () => {
  const params = useParams();
  const { user } = useAuthContext();

  const [track, setTrack] = React.useState<Track>();
  const [artist, setArtist] = React.useState<Artist>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);

  const embeddedInMirlo = isEmbeddedInMirlo();
  const playerSyncState = usePlayerSyncState();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<Track>(`tracks/${params.id}`);
        const fetchedTrack = results.result;
        setTrack(fetchedTrack);
        const response = await api.get<Artist>(
          `artists/${fetchedTrack.trackGroup.artistId}`
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

  React.useEffect(() => {
    if (!embeddedInMirlo || !track || !playerSyncState) return;
    if (playerSyncState.currentTrackId === track.id) {
      setCurrentSeconds(playerSyncState.currentSeconds);
    }
  }, [embeddedInMirlo, track, playerSyncState]);

  return {
    track,
    artist,
    isLoading,
    user,
    currentSeconds,
    setCurrentSeconds,
    embeddedInMirlo,
  };
};
