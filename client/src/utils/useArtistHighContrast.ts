import { useAuthContext } from "state/AuthContext";
import { shouldApplyArtistHighContrast } from "utils/resolveArtistColors";

import { usePrefersContrastMore } from "./usePrefersContrastMore";

/** Effective HC for a specific artist (account setting + per-artist opt-out). */
export function useArtistHighContrast(artistId?: number): boolean {
  const { user } = useAuthContext();
  const prefersContrastMore = usePrefersContrastMore();
  return shouldApplyArtistHighContrast({
    preference: user?.properties?.highContrast,
    prefersContrastMore,
    artistId,
    highContrastOffArtistIds: user?.properties?.highContrastOffArtistIds,
  });
}
