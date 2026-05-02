export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function inMirlo() {
  try {
    return window.top?.location.origin === import.meta.env.VITE_CLIENT_DOMAIN;
  } catch (e) {
    return false;
  }
}

export const isEmbeddedInMirlo = (): boolean => inIframe() && inMirlo();
