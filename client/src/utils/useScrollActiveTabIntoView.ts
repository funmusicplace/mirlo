import React from "react";
import { useLocation } from "react-router-dom";

export function useScrollActiveTabIntoView(scrollId: string) {
  const { pathname } = useLocation();
  const isFirstRun = React.useRef(true);

  React.useEffect(() => {
    const container = document.getElementById(scrollId);
    if (!container) return;
    const active = container.querySelector<HTMLAnchorElement>("a.active");
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset =
      (activeRect.left + activeRect.right) / 2 -
      (containerRect.left + containerRect.right) / 2;
    container.scrollTo({
      left: container.scrollLeft + offset,
      behavior: isFirstRun.current ? "auto" : "smooth",
    });
    isFirstRun.current = false;
  }, [scrollId, pathname]);
}
