import React from "react";

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
  const isLeft = direction === "left";
  const arrow = isLeft ? "←" : "→";
  const [isVisible, setIsVisible] = React.useState(!isLeft);

  React.useEffect(() => {
    const el = document.getElementById(scrollElementId);
    if (!el) return;

    const checkVisibility = () => {
      if (isLeft) {
        setIsVisible(el.scrollLeft > 0);
      } else {
        setIsVisible(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      }
    };

    checkVisibility();
    el.addEventListener("scroll", checkVisibility);
    return () => el.removeEventListener("scroll", checkVisibility);
  }, [scrollElementId, isLeft]);

  return (
    <div
      className={`hidden md:flex items-start pt-6 absolute ${isLeft ? "left-0" : "right-0"} top-0 h-full z-20`}
    >
      {pageBackground && (
        <div
          className={`absolute top-0 ${isLeft ? "left-0" : "right-0"} w-20 h-full pointer-events-none transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
          style={{
            background: `linear-gradient(to ${isLeft ? "left" : "right"}, transparent, ${pageBackground})`,
          }}
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
