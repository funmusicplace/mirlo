import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import React from "react";
import { useScrollOverflow } from "utils/useScrollOverflow";

interface ScrollButtonProps {
  direction: "left" | "right";
  scrollElementId: string;
  ariaLabel: string;
  scrollAmount?: number;
  pageBackground?: string;
}

const ScrollButton: React.FC<ScrollButtonProps> = ({
  direction,
  scrollElementId,
  ariaLabel,
  scrollAmount = 320,
  pageBackground,
}) => {
  const arrow = direction === "left" ? "←" : "→";
  const isVisible = useScrollOverflow(scrollElementId, direction);

  return (
    <div
      className={`hidden md:flex items-start pt-6 absolute ${direction === "left" ? "left-0" : "right-0"} top-0 h-full z-20`}
    >
      {pageBackground && (
        <ScrollFadeOverlay
          scrollElementId={scrollElementId}
          position={direction}
          fadeColor={pageBackground}
          size="5rem"
        />
      )}
      <button
        type="button"
        aria-label={ariaLabel}
        className={`text-xl relative z-10 cursor-pointer rounded-full bg-black/70 text-white w-10 h-10 flex items-center justify-center ring-1 ring-white/40 transition-opacity ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => {
          const el = document.getElementById(scrollElementId);
          if (!el) return;
          el.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
          });
        }}
      >
        {arrow}
      </button>
    </div>
  );
};

export default ScrollButton;
