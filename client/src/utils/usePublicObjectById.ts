import React from "react";
import api from "services/api";

const usePublicObjectById = <T>(endpoint: string, artistId?: string) => {
  const [object, setObject] = React.useState<T>();
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchArtist = React.useCallback(async () => {
    console.log("artistId", artistId);
    setIsLoading(true);
    try {
      if (artistId) {
        const { result } = await api.get<T>(`${endpoint}/${artistId}`);
        setObject(result);
      } else {
        setObject(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, artistId]);

  React.useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  return { object, isLoadingObject: isLoading };
};

export default usePublicObjectById;
