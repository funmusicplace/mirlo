import { css } from "@emotion/css";
import React from "react";
import { FaEllipsisH } from "react-icons/fa";
import { ScrollEdge, useScrollOverflow } from "utils/useScrollOverflow";

const ScrollMoreButton: React.FC<{
  scrollElementId: string;
  position: Extract<ScrollEdge, "left" | "right">;
  ariaLabel: string;
}> = ({ scrollElementId, position, ariaLabel }) => {
  const isVisible = useScrollOverflow(scrollElementId, position);

  const handleClick = () => {
    const el = document.getElementById(scrollElementId);
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];

    if (position === "right") {
      const rightEdge = el.scrollLeft + el.clientWidth;
      const nextHiddenIdx = children.findIndex(
        (c) => c.offsetLeft >= rightEdge
      );
      if (nextHiddenIdx < 0) {
        el.scrollTo({
          left: el.scrollWidth - el.clientWidth,
          behavior: "smooth",
        });
        return;
      }
      const nextHidden = children[nextHiddenIdx];
      let lastFit = nextHidden;
      for (let i = nextHiddenIdx + 1; i < children.length; i++) {
        const chip = children[i];
        if (
          chip.offsetLeft + chip.offsetWidth - nextHidden.offsetLeft >
          el.clientWidth
        )
          break;
        lastFit = chip;
      }
      const target = lastFit.offsetLeft + lastFit.offsetWidth - el.clientWidth;
      el.scrollTo({ left: target, behavior: "smooth" });
    } else {
      const leftEdge = el.scrollLeft;
      let prevHiddenIdx = -1;
      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].offsetLeft + children[i].offsetWidth <= leftEdge) {
          prevHiddenIdx = i;
          break;
        }
      }
      if (prevHiddenIdx < 0) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const prevHidden = children[prevHiddenIdx];
      let firstFit = prevHidden;
      for (let i = prevHiddenIdx - 1; i >= 0; i--) {
        const chip = children[i];
        if (
          prevHidden.offsetLeft + prevHidden.offsetWidth - chip.offsetLeft >
          el.clientWidth
        )
          break;
        firstFit = chip;
      }
      el.scrollTo({ left: firstFit.offsetLeft, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      className={css`
        flex-shrink: 0;
        cursor: pointer;
        background-color: var(--mi-button-tint-color);
        color: var(--mi-button-color);
        height: 1.5rem;
        padding: 0 0.5rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 0.9rem;
          height: 0.9rem;
          fill: var(--mi-button-color);
        }

        ${!isVisible &&
        `
          width: 0;
          padding: 0;
          margin-inline-start: -0.5rem;
          overflow: hidden;
          pointer-events: none;
          opacity: 0;
        `}
      `}
    >
      <FaEllipsisH />
    </button>
  );
};

export default ScrollMoreButton;
