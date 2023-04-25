import React from "react";
import api from "services/api";

const usePublicArtist = (artistId?: string) => {
  const [artist, setArtist] = React.useState<Artist>();
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchArtist = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (artistId) {
        const { result } = await api.get<Artist>(`artists/${artistId}`);
        setArtist(result);
      } else {
        setArtist(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  }, [artistId]);

  React.useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  return { artist, isLoadingArtist: isLoading };
};

export default usePublicArtist;
