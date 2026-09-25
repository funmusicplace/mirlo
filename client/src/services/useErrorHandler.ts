import React from "react";
import { useSnackbar } from "state/SnackbarContext";

import { APIResponseError } from "./APIInstance";

type APIError = {
  error: string;
  message: string;
};

export function isError(entity: unknown): entity is APIError {
  if (!entity) {
    return false;
  }
  return (entity as APIError).message !== undefined;
}

export type ErrorMessageOverride = {
  status?: number;
  body?: string;
  message: string;
};

type ErrorHandlerOptions = {
  skipSnackbar?: boolean;
  overrides?: ErrorMessageOverride[];
};

const useErrorHandler = () => {
  const snackbar = useSnackbar();
  return React.useCallback(
    (e: unknown, options?: boolean | ErrorHandlerOptions) => {
      console.error(e);

      const { skipSnackbar, overrides } =
        typeof options === "boolean"
          ? { skipSnackbar: options }
          : (options ?? {});

      if (skipSnackbar) {
        return;
      }

      if (overrides && e instanceof APIResponseError) {
        const backendError = (e.body as { error?: string } | undefined)?.error;
        const override = overrides.find(
          (o) =>
            (o.status !== undefined && o.status === e.status) ||
            (o.body !== undefined && o.body === backendError)
        );
        if (override) {
          snackbar(override.message, { type: "warning" });
          return;
        }
      }

      if (isError(e)) {
        snackbar(e.message, { type: "warning" });
      } else {
        snackbar("There was a problem with the API", { type: "warning" });
      }
    },
    [snackbar]
  );
};

export default useErrorHandler;
