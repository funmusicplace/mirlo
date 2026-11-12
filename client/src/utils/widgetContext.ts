import { CLIENT_ROOT } from "../constants";

export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function inMirlo() {
  try {
    return window.top?.location.origin === CLIENT_ROOT;
  } catch (e) {
    return false;
  }
}

export const isEmbeddedInMirlo = (): boolean => inIframe() && inMirlo();
