import b64ToBlob from "b64-to-blob";
import fileSaver from "file-saver";

export class APIResponseError<T = unknown> extends Error {
  status: number;
  body: T;

  constructor(message: string, status: number, body: T) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const APIInstance = (apiRoot: string, mirloApiKey: string) => {
  const api = `${apiRoot}/v1/`;
  const auth = `${apiRoot}/auth/`;
  const authEndpoints = [
    "profile",
    "login",
    "logout",
    "refresh",
    "verify-email",
    "verify-password",
    "signup",
    "confirm-email-token",
    "resend-verification-email",
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
    const req = new Request(`${root}${endpoint}`, {
      headers: {
        ...requestOptions?.headers,
      },
      ...requestOptions,
    });

    req.headers.append("mirlo-api-key", mirloApiKey);

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
        const message =
          JSON.stringify(json?.error) ?? "There was a problem with the API";
        throw new APIResponseError(message, resp.status, json);
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

  const downloadFile = async (
    endpoint: string,
    options: { fallbackName: string },
    isRetry = false
  ): Promise<{ ok: true } | { ok: false; error?: string }> => {
    const resp = await apiRequest<Response>(
      endpoint,
      { method: "GET", credentials: "include" },
      { noProcess: true }
    );

    if (!resp.ok) {
      // JWT expired — refresh token and retry once
      if (resp.status === 401 && !isRetry) {
        try {
          const errJson = await resp.json();
          if (errJson?.error === "jwt expired") {
            await apiRequest("refresh", { method: "POST" });
            return downloadFile(endpoint, options, true);
          }
        } catch {
          // refresh failed; fall through to generic error
        }
      }

      try {
        const errJson = await resp.json();
        if (typeof errJson?.error === "string") {
          return { ok: false, error: errJson.error };
        }
        if (errJson?.error) {
          return { ok: false, error: JSON.stringify(errJson.error) };
        }
      } catch {
        // body wasn't JSON; fall through to a generic failure
      }
      return { ok: false };
    }

    // The /download endpoint can return 200 + JSON in two cases:
    // - { result: { url } }: a short-lived presigned storage URL — navigate
    //   to it so the file downloads straight from storage. A top-level
    //   navigation isn't subject to CORS (unlike fetching the cross-origin
    //   URL and building a blob), and the URL's response-content-disposition
    //   makes the browser download it in place instead of leaving the page.
    // - { result: { jobId } }: the zip isn't ready yet (a generation job was
    //   queued). Treat that as a soft error rather than trying to save the
    //   JSON payload as a zip file.
    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      let json: { result?: { url?: unknown } } | undefined;
      try {
        json = await resp.json();
      } catch {
        // ignore
      }
      const url = json?.result?.url;
      if (typeof url === "string") {
        window.location.assign(url);
        return { ok: true };
      }
      return {
        ok: false,
        error: "The download is not ready yet. Please try again in a moment.",
      };
    }

    const blob = await resp.blob();
    const disposition = resp.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^"';]+)"?/i);
    const filename = match
      ? decodeURIComponent(match[1])
      : options.fallbackName;

    fileSaver.saveAs(blob, filename);

    return { ok: true };
  };

  return {
    root: api,
    paymentProcessor: {
      stripeConnect: (userId: number) => api + `users/${userId}/stripe/connect`,
      paypalConnect: (userId: number) => api + `users/${userId}/paypal/connect`,
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

    /**
     * Warning: for this to work, FormData fields must appear first in the form
     * data for busboy to parse them before they get to the file.
     * @param endpoint
     * @param files
     * @param bodyParams
     * @returns
     */
    uploadFile: async (
      endpoint: string,
      files: File[],
      bodyParams?: { [key: string]: string }
    ): Promise<{ result: { jobId: string } & { imageId: string } }> => {
      var fd = new FormData();
      if (bodyParams) {
        Object.keys(bodyParams).forEach((key) => {
          fd.append(`${key}`, bodyParams[key]);
        });
      }

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

    streamUrl: (track: { audio?: { url: string } }): string | undefined => {
      if (track.audio) {
        return `${apiRoot}${track.audio.url}`;
      } else {
        return undefined;
      }
    },

    getFileDownloadUrl: (fromEndpoint: string): string => {
      return `${apiRoot}/v1/${fromEndpoint}`;
    },

    downloadFile,

    generateDownload: (endpoint: string) => {
      return apiRequest<Response>(
        endpoint,
        {
          method: "GET",
        },
        {
          noProcess: true,
        }
      ).then((resp) => {
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
