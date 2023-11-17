import React from "react";
import api from "services/api";

const useGetUserObjectById = <T>(
  endpoint: string,
  userId?: number,
  id?: string,
  queryParams?: string,
  options?: { multiple?: boolean }
) => {
  const [object, setObject] = React.useState<T>();
  const [objects, setObjects] = React.useState<T[]>();

  const [isLoading, setIsLoading] = React.useState(true);
  const [finishedFirstLoad, setFinishedFirstLoad] = React.useState(false);

  const fetchObject = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (userId && id) {
        if (options?.multiple) {
          const response = await api.getMany<T>(
            `users/${userId}/${endpoint}/${id}${queryParams ?? ""}`
          );
          setObjects(response.results);
        } else {
          const response = await api.get<T>(
            `users/${userId}/${endpoint}/${id}${queryParams ?? ""}`
          );
          setObject(response.result);
        }
        setFinishedFirstLoad(true);
      } else {
        setObject(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, id, options?.multiple, queryParams, userId]);

  React.useEffect(() => {
    fetchObject();
  }, [fetchObject]);

  return {
    object,
    objects,
    isLoadingObject: isLoading,
    reload: fetchObject,
    finishedFirstLoad,
  };
};

export default useGetUserObjectById;
