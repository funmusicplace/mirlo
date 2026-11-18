import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getInjectedArtist, getInjectedTrack } from "utils/injectedData";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

export const useTrackWidgetData = () => {
  const params = useParams();
  const { user } = useAuthContext();

  const [track, setTrack] = React.useState<Track>();
  const [artist, setArtist] = React.useState<Artist>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [localSeconds, setCurrentSeconds] = React.useState(0);

  const embeddedInMirlo = isEmbeddedInMirlo();
  const playerSyncState = usePlayerSyncState();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      try {
        const injectedTrack = getInjectedTrack(params.id!);
        if (injectedTrack) {
          setTrack(injectedTrack);
          const artistId = injectedTrack.trackGroup?.artistId;
          const injectedArtist = artistId
            ? getInjectedArtist(artistId)
            : undefined;
          if (injectedArtist) {
            setArtist(injectedArtist);
            return;
          }
        }
        if (!injectedTrack) {
          const results = await api.get<Track>(`tracks/${params.id}`);
          const fetchedTrack = results.result;
          setTrack(fetchedTrack);

          const response = await api.get<Artist>(
            `artists/${fetchedTrack.trackGroup.artistId}`
          );
          setArtist(response.result);
        }
      } catch (e) {
        console.error("e", e);
      } finally {
        setIsLoading(false);
      }
    };
    callback();
  }, [params.id]);

  const isSyncedTrack = !!track && playerSyncState?.currentTrackId === track.id;
  const currentSeconds = embeddedInMirlo
    ? isSyncedTrack
      ? (playerSyncState?.currentSeconds ?? 0)
      : 0
    : localSeconds;

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

export type TrackWidgetData = ReturnType<typeof useTrackWidgetData>;
