import { useInstanceSettings } from "queries/instanceSettings";
import { useLocation } from "react-router-dom";

const WELCOME_PATH = "/admin/welcome";

const PATHS_ALLOWED_DURING_WELCOME = ["/password-reset"];

export const useSetupRedirect = (): string | null => {
  const { setupStage } = useInstanceSettings();
  const { pathname } = useLocation();

  if (
    setupStage === "welcome" &&
    !PATHS_ALLOWED_DURING_WELCOME.some((path) => pathname.startsWith(path))
  ) {
    return WELCOME_PATH;
  }

  return null;
};

export default useSetupRedirect;
