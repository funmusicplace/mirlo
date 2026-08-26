import { useMediaQuery } from "./useMediaQuery";

export function usePrefersContrastMore(): boolean {
  return useMediaQuery("(prefers-contrast: more)");
}
