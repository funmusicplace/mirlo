const APIInstance = (apiRoot: string) => {
  const api = `${apiRoot}/v1/`;
  const auth = `${apiRoot}/auth/`;
  const authEndpoints = ["profile", "login", "logout", "refresh", "signup"];

  const apiRequest = async <R>(
    endpoint: string,
    options?: RequestInit
  ): Promise<R> => {
    const root = authEndpoints.includes(endpoint) ? auth : api;
    const req = new Request(`${root}${endpoint}`, options);

    const resp = await fetch(req);
    const json = await resp.json();

    if (resp.status === 401 && json.error === "jwt expired") {
      try {
        await apiRequest("refresh", { method: "POST" });
        return await apiRequest(endpoint, options);
      } catch (e) {
        throw new Error("Log in expired");
      }
    }

    if (resp.status >= 400) {
      throw new Error(json.error);
    }
    return json;
  };

  return {
    request: apiRequest,

    post: async <T, R>(
      endpoint: string,
      data: T,
      options?: RequestInit
    ): Promise<R> => {
      return apiRequest<R>(endpoint, {
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
      return apiRequest<R>(endpoint, {
        method: "PUT",
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

    uploadFile: async (endpoint: string, files: File[]) => {
      var fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("upload", files[i]);
      }
      return apiRequest(endpoint, {
        method: "PUT",
        credentials: "include",
        body: fd,
      });
    },

    get: async <R>(endpoint: string): Promise<R> => {
      return apiRequest<R>(endpoint, {
        method: "GET",
        credentials: "include",
      });
    },

    delete: async <R>(endpoint: string): Promise<R> => {
      return apiRequest<R>(endpoint, {
        method: "DELETE",
        credentials: "include",
      });
    },

    streamUrl: (track: Track): string => {
      return `${apiRoot}${track.audio.url}`;
    },
  };
};

export default APIInstance;
