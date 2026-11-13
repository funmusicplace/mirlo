import { useMatchMedia } from "./useMatchMedia";

/** True when the OS/browser forced-colors mode is active. */
export function useForcedColors(): boolean {
  return useMatchMedia("(forced-colors: active)");
}
