import { resolveArtistColors } from "utils/resolveArtistColors";

import { useArtistHighContrast } from "./useArtistHighContrast";

export { useArtistHighContrast } from "./useArtistHighContrast";

export function useResolvedArtistColors(
  raw?: ArtistColors,
  artistId?: number
): ArtistColors {
  const highContrast = useArtistHighContrast(artistId);
  return resolveArtistColors(raw, { highContrast });
}

export function useWidgetArtistColors(
  raw?: ArtistColors,
  artistId?: number
): ArtistColors | undefined {
  const highContrast = useArtistHighContrast(artistId);
  if (!raw && !highContrast) {
    return undefined;
  }
  return resolveArtistColors(raw, { highContrast });
}
