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

const TooltipText = styled.span`
  visibility: hidden;
  min-width: 200px;
  font-size: 1rem;
  line-height: 1rem;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.75rem;

  position: absolute;
  z-index: 999;

  top: 100%;

  &:after {
    content: " ";
    position: absolute;
    bottom: 100%; /* At the bottom of the tooltip */
    left: 10%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent black transparent;
  }

  @media screen and (max-width: ${bp.medium}px) {
    display: none !important;
  }
`;

export const Tooltip: React.FC<{
  hoverText: string;
  children: React.ReactNode;
  underline?: boolean;
}> = ({ children, hoverText, underline = true }) => {
  return (
    <TooltipWrapper underline={underline}>
      {children}
      <TooltipText className="tooltiptext">{hoverText}</TooltipText>
    </TooltipWrapper>
  );
};

export default Tooltip;
