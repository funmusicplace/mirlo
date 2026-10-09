import { wasSetupGuideSeen } from "components/Setup/guide/setupGuideSeen";
import { useInstanceSettings } from "queries/instanceSettings";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const WELCOME_PATH = "/admin/welcome";

const SETUP_GUIDE_PATH = "/admin/setup";

const PATHS_ALLOWED_DURING_SETUP = ["/password-reset"];

export const useSetupRedirect = (): string | null => {
  const { setupStage } = useInstanceSettings();
  const { user } = useAuthContext();
  const { pathname } = useLocation();

  if (PATHS_ALLOWED_DURING_SETUP.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (setupStage === "welcome") {
    return WELCOME_PATH;
  }

  if (
    setupStage === "guide" &&
    user?.isAdmin &&
    !wasSetupGuideSeen() &&
    !pathname.startsWith(SETUP_GUIDE_PATH)
  ) {
    return SETUP_GUIDE_PATH;
  }

  return null;
};

export default useSetupRedirect;
