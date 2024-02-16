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
    console.log("fetching object");
    try {
      if (userId && id) {
        if (options?.multiple) {
          const response = await api.getMany<T>(
            `users/${userId}/${endpoint}/${id}${queryParams ?? ""}`
          );
          setObjects(response.results);
        } else {
          console.log("single object");
          const response = await api.get<T>(
            `users/${userId}/${endpoint}/${id}${queryParams ?? ""}`
          );
          console.log("result", response.result);
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
