import React from "react";
import { ScrollEdge, useScrollOverflow } from "utils/useScrollOverflow";

const ScrollFadeOverlay: React.FC<{
  scrollElementId: string;
  position: ScrollEdge;
  fadeColor?: string;
  size?: string;
}> = ({ scrollElementId, position, fadeColor, size = "2rem" }) => {
  const isVisible = useScrollOverflow(scrollElementId, position);
  const isVertical = position === "top" || position === "bottom";

  const gradientDirection = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }[position];

  const positionClass = {
    top: "top-0 left-0 right-0",
    bottom: "bottom-0 left-0 right-0",
    left: "top-0 bottom-0 left-0",
    right: "top-0 bottom-0 right-0",
  }[position];

  return (
    <div
      className={`pointer-events-none absolute ${positionClass} transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        [isVertical ? "height" : "width"]: size,
        background: `linear-gradient(to ${gradientDirection}, ${
          fadeColor ?? "var(--mi-background-color)"
        }, transparent)`,
      }}
    />
  );
};

export default ScrollFadeOverlay;
