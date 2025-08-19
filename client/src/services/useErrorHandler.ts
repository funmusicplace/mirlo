import { useSnackbar } from "state/SnackbarContext";

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

const useErrorHandler = () => {
  const snackbar = useSnackbar();
  return (e: unknown, skipSnackbar?: boolean) => {
    console.error(e);

    if (skipSnackbar) {
      return;
    }
    if (isError(e)) {
      snackbar(e.message, { type: "warning" });
    } else {
      snackbar("There was a problem with the API", { type: "warning" });
    }
  };
};

export default useErrorHandler;
