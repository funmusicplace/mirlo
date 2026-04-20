import styled from "@emotion/styled";
import { bp } from "../../constants";
import React from "react";

const TooltipWrapper = styled.div<{ underline: boolean }>`
  position: relative;
  z-index: 998;
  cursor: pointer;
  display: inline-block;

  ${(props) => (props.underline ? "border-bottom: 1px dotted black" : "")};

  &:hover .tooltiptext {
    visibility: visible;
  }

  @media screen and (max-width: ${bp.medium}px) {
    display: none !important;
  }
`;

const TooltipText = styled.span<{
  compact?: boolean;
  position?: "below" | "right";
}>`
  visibility: hidden;
  min-width: ${(props) => (props.compact ? "80px" : "200px")};
  font-size: ${(props) => (props.compact ? "0.75rem" : "1rem")};
  line-height: ${(props) => (props.compact ? "0.75rem" : "1rem")};
  background-color: black;
  color: #fff;
  text-align: center;
  padding: ${(props) => (props.compact ? "0.25rem" : "0.5rem")};
  border-radius: 6px;

  position: absolute;
  z-index: 999;

  ${(props) => {
    if (props.position === "right") {
      return `
        top: 50%;
        left: calc(100% + 0.5rem);
        transform: translateY(-50%);
        margin-top: 0;

        &:after {
          content: " ";
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: transparent black transparent transparent;
        }
      `;
    } else {
      return `
        top: 100%;
        left: 0%;
        margin-top: ${props.compact ? "0.25rem" : "0.75rem"};

        &:after {
          content: " ";
          position: absolute;
          bottom: 100%;
          left: ${props.compact ? "10%" : "50%"};
          margin-left: ${props.compact ? "0px" : "-5px"};
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
  return (
    <TooltipWrapper underline={underline}>
      {children}
      <TooltipText
        compact={compact}
        className="tooltiptext"
        position={position}
      >
        {hoverText}
      </TooltipText>
    </TooltipWrapper>
  );
};

export default Tooltip;
