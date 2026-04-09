import React from "react";

interface ScrollButtonProps {
  direction: "left" | "right";
  scrollElementId: string;
  ariaLabel: string;
  scrollAmount?: number;
}

const ScrollButton: React.FC<ScrollButtonProps> = ({
  direction,
  scrollElementId,
  ariaLabel,
  scrollAmount = 320,
}) => {
  const isLeft = direction === "left";
  const arrow = isLeft ? "←" : "→";

  return (
    <div
      className={`hidden md:block absolute ${isLeft ? "left-0" : "right-0"} top-0 h-screen w-20 group z-20`}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        className={`absolute cursor-pointer ${isLeft ? "left-4" : "right-4"} top-1/4 -translate-y-3/4 rounded-full bg-black/70 text-white px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100`}
        onClick={() => {
          const el = document.getElementById(scrollElementId);
          if (!el) return;
          el.scrollBy({
            left: isLeft ? -scrollAmount : scrollAmount,
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
