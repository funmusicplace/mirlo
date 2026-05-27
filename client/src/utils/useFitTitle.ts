import React from "react";

const MOBILE_QUERY = "(max-width: 768px)";

/**
 * Shrinks a title to fit its container by writing a --fit-scale CSS
 * variable (with a min size limit after which it wraps).
 * Desktop: scales down if the title overflows width.
 * Mobile: scales down if it exceeds the max number of lines.
 */
export function useFitTitle<T extends HTMLElement>({
  desktopMinScale = 0.5,
  mobileMaxLines = 2,
  mobileMinScale = 0.75,
  deps = [],
}: {
  desktopMinScale?: number;
  mobileMaxLines?: number;
  mobileMinScale?: number;
  deps?: React.DependencyList;
} = {}) {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.setProperty("--fit-scale", "1");
      delete el.dataset.fitOverflow;
      requestAnimationFrame(() => {
        const isMobile = window.matchMedia(MOBILE_QUERY).matches;
        if (isMobile) {
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
          if (!lineHeight || lineHeight <= 0) return;
          const maxHeight = lineHeight * mobileMaxLines;
          const currentHeight = el.scrollHeight;
          if (currentHeight > maxHeight) {
            const ratio = maxHeight / currentHeight;
            el.style.setProperty(
              "--fit-scale",
              String(Math.max(mobileMinScale, ratio))
            );
          }
        } else {
          const overflow = el.scrollWidth - el.clientWidth;
          if (overflow > 0 && el.clientWidth > 0) {
            const ratio = el.clientWidth / el.scrollWidth;
            if (ratio < desktopMinScale) {
              el.style.setProperty("--fit-scale", String(desktopMinScale));
              el.dataset.fitOverflow = "true";
            } else {
              el.style.setProperty("--fit-scale", String(ratio));
            }
          }
        }
      });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);

    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener("change", fit);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", fit);
    };
  }, [desktopMinScale, mobileMaxLines, mobileMinScale, ...deps]);

  return ref;
}
