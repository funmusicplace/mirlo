/**
 * Shared bits for the Widget/* stories, which render the widget pages
 * (pages/widget/...) exactly as they're served inside an embed iframe.
 */
import type { Decorator } from "@storybook/react";
import React from "react";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

/** Router parameters for a widget page at /widget/:kind/:id?variant= */
export const widgetRoute = (
  kind: "trackGroup" | "track" | "post" | "label",
  id: number,
  variant?: string
) =>
  reactRouterParameters({
    location: {
      pathParams: { id: String(id) },
      searchParams: variant ? { variant } : undefined,
    },
    routing: { path: `/widget/${kind}/:id` },
  });

/**
 * The app marks widget pages with html[data-widget] so the page doesn't
 * reserve a scrollbar gutter, which would clip the widget's right edge.
 */
export const noPageScroll: Decorator = (Story) => (
  <>
    <style>
      {"html { scrollbar-gutter: auto !important; overflow: hidden; }"}
    </style>
    <Story />
  </>
);

/**
 * `beforeEach` for widget stories: start with an empty player queue, so
 * nothing played in an earlier story shows up as already loaded.
 */
export const clearPlayerQueue = () => {
  try {
    localStorage.removeItem("nomadState");
  } catch {
    // storage unavailable: nothing to clear
  }
};
