import React from "react";
import api from "services/api";

const useGetUserObjectById = <T>(
  endpoint: string,
  userId?: number,
  id?: string,
  queryParams?: string
) => {
  const [object, setObject] = React.useState<T>();
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchObject = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (queryParams) {
      }
      if (userId && id) {
        const { result } = await api.get<T>(
          `users/${userId}/${endpoint}/${id}${queryParams ?? ""}`
        );
        setObject(result);
      } else {
        setObject(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, id, queryParams, userId]);

  React.useEffect(() => {
    fetchObject();
  }, [fetchObject]);

  return { object, isLoadingObject: isLoading, reload: fetchObject };
};

export default useGetUserObjectById;
