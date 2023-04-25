import React from "react";
import api from "services/api";

const usePublicArtist = (artistId?: string) => {
  const [artist, setArtist] = React.useState<Artist>();

  const fetchArtist = React.useCallback(async () => {
    if (artistId) {
      const { result } = await api.get<Artist>(`artists/${artistId}`);
      setArtist(result);
    } else {
      setArtist(undefined);
    }
  }, [artistId]);

  React.useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  return { artist };
};

export default usePublicArtist;
