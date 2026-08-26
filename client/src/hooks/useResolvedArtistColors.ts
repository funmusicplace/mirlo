import { resolveArtistColors } from "utils/resolveArtistColors";

import { useHighContrast } from "./useHighContrast";
import { usePrefersColorScheme } from "./usePrefersColorScheme";

export function useResolvedArtistColors(raw?: ArtistColors): ArtistColors {
  const highContrast = useHighContrast();
  const prefersDark = usePrefersColorScheme();
  return resolveArtistColors(raw, { highContrast, prefersDark });
}

export function useWidgetArtistColors(raw?: ArtistColors): ArtistColors | undefined {
  const highContrast = useHighContrast();
  const prefersDark = usePrefersColorScheme();
  if (!raw && !highContrast) {
    return undefined;
  }
  return resolveArtistColors(raw, { highContrast, prefersDark });
}
