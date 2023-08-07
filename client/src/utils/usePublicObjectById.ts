import React from "react";
import api from "services/api";

const usePublicObjectById = <T>(
  endpoint: string,
  artistId?: string,
  queryParams?: string
) => {
  const [object, setObject] = React.useState<T>();
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchArtist = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (queryParams) {
      }
      if (artistId) {
        const { result } = await api.get<T>(
          `${endpoint}/${artistId}${queryParams ?? ""}`
        );
        setObject(result);
      } else {
        setObject(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, artistId, queryParams]);

  React.useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  return { object, isLoadingObject: isLoading };
};

export default usePublicObjectById;
