const APIInstance = (apiRoot: string) => {
  const api = `${apiRoot}/v1/`;
  const auth = `${apiRoot}/auth/`;
  const authEndpoints = ["profile", "login", "logout", "refresh", "signup"];

  const apiRequest = async (endpoint: string, options?: RequestInit) => {
    const root = authEndpoints.includes(endpoint) ? auth : api;
    const req = new Request(`${root}${endpoint}`, options);

    const resp = await fetch(req);
    return await resp.json();
  };

  return {
    request: apiRequest,

    post: async <T, R>(
      endpoint: string,
      data: T,
      options?: RequestInit
    ): Promise<R> => {
      return apiRequest(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
        }),
        ...options,
      });
    },

    put: async <T, R>(
      endpoint: string,
      data: T,
      options?: RequestInit
    ): Promise<R> => {
      return apiRequest(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
        }),
        ...options,
      });
    },

    get: async <R>(endpoint: string): Promise<R> => {
      return apiRequest(endpoint, {
        method: "GET",
        credentials: "include",
      });
    },

    delete: async <R>(endpoint: string): Promise<R> => {
      return apiRequest(endpoint, {
        method: "DELETE",
        credentials: "include",
      });
    },
  };
};

export default APIInstance;
