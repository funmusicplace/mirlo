import { useMediaQuery } from "./useMediaQuery";

export function usePrefersColorScheme(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}
