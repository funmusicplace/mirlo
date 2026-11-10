import { useMatchMedia } from "./useMatchMedia";

export function usePrefersColorScheme(): boolean {
  return useMatchMedia("(prefers-color-scheme: dark)");
}
