import React from "react";

const Skeleton: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className, style }) => (
  <div
    aria-hidden
    style={style}
    className={`animate-shine rounded-md bg-size-[200%_100%] bg-[linear-gradient(110deg,var(--mi-tint-color)_8%,var(--mi-tint-x-color)_18%,var(--mi-tint-color)_33%)] ${className ?? ""}`}
  />
);

export default Skeleton;
