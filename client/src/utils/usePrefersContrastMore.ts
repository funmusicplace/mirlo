import { useMatchMedia } from "./useMatchMedia";

export function usePrefersContrastMore(): boolean {
  return useMatchMedia("(prefers-contrast: more)");
}
