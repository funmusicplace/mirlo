import styled from "@emotion/styled";
import React from "react";
import { createPortal } from "react-dom";

import { bp } from "../../constants";

const TooltipWrapper = styled.div<{ underline: boolean }>`
  position: relative;
  cursor: pointer;
  display: inline-block;

  ${(props) => (props.underline ? "border-bottom: 1px dotted black" : "")};
`;

const TooltipText = styled.span<{
  compact?: boolean;
  position?: "below" | "right";
}>`
  min-width: ${(props) => (props.compact ? "80px" : "200px")};
  max-width: ${(props) => (props.compact ? "160px" : "240px")};
  overflow-wrap: anywhere;
  font-size: ${(props) => (props.compact ? "0.75rem" : "1rem")};
  line-height: ${(props) => (props.compact ? "0.75rem" : "1rem")};
  background-color: black;
  color: #fff;
  text-align: center;
  padding: ${(props) => (props.compact ? "0.25rem" : "0.5rem")};
  border-radius: 6px;

  position: fixed;
  z-index: 1004;
  pointer-events: none;

  ${(props) => {
    if (props.position === "right") {
      return `
        transform: translateY(-50%);

        &:after {
          content: " ";
          position: absolute;
          left: -9px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: transparent black transparent transparent;
        }
      `;
    } else {
      return `
        transform: translateX(-50%);

        &:after {
          content: " ";
          position: absolute;
          bottom: calc(100% - 1px);
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent black transparent;
        }
      `;
    }
  }}

  @media screen and (max-width: ${bp.medium}px) {
    display: none !important;
  }
`;

export const Tooltip: React.FC<{
  hoverText: string;
  children: React.ReactNode;
  underline?: boolean;
  compact?: boolean;
  position?: "below" | "right";
}> = ({
  children,
  hoverText,
  underline = true,
  compact,
  position = "below",
}) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  const computeCoords = React.useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (position === "right") {
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    } else {
      setCoords({
        top: rect.bottom + (compact ? 4 : 12),
        left: rect.left + rect.width / 2,
      });
    }
  }, [compact, position]);

  React.useEffect(() => {
    if (!coords) return;
    const onReposition = () => computeCoords();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [coords, computeCoords]);

  return (
    <TooltipWrapper
      ref={wrapperRef}
      underline={underline}
      onMouseEnter={computeCoords}
      onMouseLeave={() => setCoords(null)}
    >
      {children}
      {coords &&
        createPortal(
          <TooltipText
            compact={compact}
            className="tooltiptext"
            position={position}
            style={{ top: coords.top, left: coords.left }}
          >
            {hoverText}
          </TooltipText>,
          document.body
        )}
    </TooltipWrapper>
  );
};

export default Tooltip;
