import { http, HttpResponse } from "msw";

import { SHOWCASE_VIEWPORTS } from "./fixtures";

/** Default every showcase story to the 1280x800 recording viewport */
export const recordingViewport = {
  viewport: { viewports: SHOWCASE_VIEWPORTS, defaultViewport: "recording" },
};

/** Logged out (401), or logged in as the given user */
export const authAs = (user: LoggedInUser | null) => [
  http.get("*/auth/profile", () =>
    user
      ? HttpResponse.json({ result: user })
      : new HttpResponse(null, { status: 401 })
  ),
  http.post("*/auth/refresh", () =>
    user ? HttpResponse.json({}) : new HttpResponse(null, { status: 401 })
  ),
];

/** The test runner identifies itself in the user agent */
const isTestRunner = () =>
  typeof navigator !== "undefined" &&
  navigator.userAgent.includes("StorybookTestRunner");

/**
 * Wait a beat so a recording shows each step. Under the test runner it
 * returns at once, so hands-free stories finish within its timeout.
 */
export const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, isTestRunner() ? 0 : ms));

/**
 * Scroll the page so `element` sits `offset` px below the top of the frame.
 * Waits first so images and late queries have settled the layout.
 */
export const scrollToElement = async (element: Element, offset = 120) => {
  await pause(800);
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "instant" });
};

/**
 * Some buttons ask `window.confirm` first. A native dialog looks out of place
 * in a recording, so the stories answer "OK" for the viewer.
 */
export const autoConfirm = () => {
  const original = window.confirm;
  window.confirm = () => true;
  return () => {
    window.confirm = original;
  };
};
