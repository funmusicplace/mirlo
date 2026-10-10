import { safeLocalStorage } from "utils/safeStorage";

const SETUP_GUIDE_SEEN_KEY = "mirlo-setup-guide-seen";

let seenWithoutStorage = false;

export const markSetupGuideSeen = () => {
  safeLocalStorage.write(SETUP_GUIDE_SEEN_KEY, "true");
  if (safeLocalStorage.read(SETUP_GUIDE_SEEN_KEY) !== "true") {
    seenWithoutStorage = true;
  }
};

export const wasSetupGuideSeen = () =>
  seenWithoutStorage || safeLocalStorage.read(SETUP_GUIDE_SEEN_KEY) === "true";
