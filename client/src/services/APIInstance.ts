import b64ToBlob from "b64-to-blob";
import fileSaver from "file-saver";

const APIInstance = (apiRoot: string) => {
  const api = `${apiRoot}/v1/`;
  const auth = `${apiRoot}/auth/`;
  const authEndpoints = [
    "profile",
    "login",
    "logout",
    "refresh",
    "signup",
    "password-reset/initiate",
    "password-reset/set-password",
  ];

  const apiRequest = async <R>(
    endpoint: string,
    requestOptions?: RequestInit,
    options?: {
      text?: boolean;
      noProcess?: boolean;
    }
  ): Promise<R> => {
    const root = authEndpoints.includes(endpoint) ? auth : api;
    const req = new Request(`${root}${endpoint}`, requestOptions);

    try {
      const resp = await fetch(req);
      if (options?.noProcess) {
        return resp as R;
      }
      if (options?.text) {
        return resp.text() as R;
      }
      const json = await resp.json();
      if (resp.status === 401 && json.error === "jwt expired") {
        try {
          await apiRequest("refresh", { method: "POST" });
          return await apiRequest(endpoint, requestOptions);
        } catch (e) {
          throw new Error("Log in expired");
        }
      }

      if (resp.status >= 400) {
        throw new Error(json.error);
      }
      return json;
    } catch (e) {
      console.error("API Instance catching error", e);
      if (
        e instanceof Error &&
        (e.message.includes("NetworkError") || e.name === "NetworkError")
      ) {
        throw new Error("NetworkError");
      }
      throw e;
    }
  };

  return {
    root: api,
    paymentProcessor: {
      stripeConnect: (userId: number) => api + `users/${userId}/stripe/connect`,
    },
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
        body: JSON.stringify(data),
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
        body: JSON.stringify(data),
        ...options,
      });
    },

    uploadFile: async (
      endpoint: string,
      files: File[]
    ): Promise<{ result: { jobId: string } }> => {
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

    get: async <R>(
      endpoint: string,
      signal?: AbortSignal
    ): Promise<{ result: R }> => {
      return apiRequest<{ result: R }>(endpoint, {
        method: "GET",
        credentials: "include",
        signal,
      });
    },

    getMany: async <R>(
      endpoint: string,
      query?: { [key: string]: string }
    ): Promise<{ results: R[]; total?: number }> => {
      const fullEndpoint = convertQueryToSearchParams(endpoint, query);

      return apiRequest<{ results: R[]; total?: number }>(fullEndpoint, {
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

    streamUrl: (track: Track): string | undefined => {
      if (track.audio) {
        return `${apiRoot}${track.audio.url}`;
      } else {
        return undefined;
      }
    },

    downloadFileDirectly: (
      fromEndpoint: string,
      filename: string
    ): null | unknown => {
      return apiRequest<Response>(
        fromEndpoint,
        {
          method: "GET",
          credentials: "include",
        },
        {
          noProcess: true,
        }
      ).then((resp) => {
        if (resp.headers.get("content-type")?.includes("application/json")) {
          return resp.json();
        } else if (
          resp.headers.get("content-type")?.includes("application/zip")
        ) {
          fileSaver.saveAs(`${api}${fromEndpoint}`, filename);
          return;
        }
      });
    },

    generateDownload: (endpoint: string) => {
      return apiRequest<Response>(
        endpoint,
        {
          method: "GET"
        },
        {
          noProcess: true
        }
      ).then(resp => {
        return resp.json();
      });
    },

    getFile: (filename: string, endpoint: string, type: string) => {
      return apiRequest<string>(
        endpoint,
        {
          method: "GET",
          credentials: "include",
        },
        {
          text: true,
        }
      ).then((text) => {
        let blob;
        if (type === "text/csv") {
          blob = new Blob([text], {
            type: "text/csv;charset=utf-8;",
          });
        } else {
          blob = b64ToBlob(text, type);
        }
        fileSaver.saveAs(blob, `${filename}.${type.split("/")[1]}`);
        return;
      });
    },
  };
};

const convertQueryToSearchParams = (
  endpoint: string,
  query?: { [key: string]: string }
) => {
  if (query) {
    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((key) => {
      searchParams.set(key, query[key]);
    });
    return endpoint + "?" + searchParams.toString();
  }
  return endpoint;
};

export default APIInstance;
