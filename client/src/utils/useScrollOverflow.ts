import React from "react";

export type ScrollEdge = "top" | "bottom" | "left" | "right";

export const useScrollOverflow = (
  scrollElementId: string,
  edge: ScrollEdge
): boolean => {
  const isVertical = edge === "top" || edge === "bottom";
  const isStart = edge === "top" || edge === "left";
  const [hasOverflow, setHasOverflow] = React.useState(!isStart);

  React.useEffect(() => {
    const el = document.getElementById(scrollElementId);
    if (!el) return;

    const check = () => {
      if (isVertical) {
        if (isStart) setHasOverflow(el.scrollTop > 0);
        else
          setHasOverflow(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
      } else {
        if (isStart) setHasOverflow(el.scrollLeft > 0);
        else
          setHasOverflow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      }
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [scrollElementId, isVertical, isStart]);

  return hasOverflow;
};
