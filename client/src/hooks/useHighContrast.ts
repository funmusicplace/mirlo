import { useAuthContext } from "state/AuthContext";

import { usePrefersContrastMore } from "./usePrefersContrastMore";
import { getEffectiveHighContrast } from "../utils/resolveArtistColors";

export function useHighContrast(): boolean {
  const { user } = useAuthContext();
  const prefersContrastMore = usePrefersContrastMore();
  return getEffectiveHighContrast(
    user?.properties?.highContrast,
    prefersContrastMore
  );
}
