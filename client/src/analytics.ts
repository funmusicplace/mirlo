/**
 * Loads the Umami tracking script (self-hosted, see render.yaml).
 *
 * Only runs when VITE_UMAMI_WEBSITE_ID is set — it's unset in local dev so
 * no events are recorded there. Umami automatically tracks SPA route
 * changes by hooking the History API, so loading the script once is enough.
 */
export const initAnalytics = () => {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!websiteId) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src =
    import.meta.env.VITE_UMAMI_SRC ?? "https://stats.mirlo.space/script.js";
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
};
