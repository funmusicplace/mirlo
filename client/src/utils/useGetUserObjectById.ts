import React from "react";
import api from "services/api";

const useGetUserObjectById = <T>(
  endpoint: string,
  options?: { multiple?: boolean }
) => {
  const [object, setObject] = React.useState<T>();
  const [objects, setObjects] = React.useState<T[]>();

  const [isLoading, setIsLoading] = React.useState(true);
  const [finishedFirstLoad, setFinishedFirstLoad] = React.useState(false);

  const fetchObject = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (options?.multiple) {
        const response = await api.getMany<T>(`${endpoint}`);
        setObjects(response.results);
      } else {
        const response = await api.get<T>(`${endpoint}`);
        setObject(response.result);
      }
      setFinishedFirstLoad(true);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, options?.multiple]);

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
