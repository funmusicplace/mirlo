import styled from "@emotion/styled";
import React from "react";

const TooltipWrapper = styled.div<{ underline: boolean }>`
  position: relative;
  display: inline-block;

  ${(props) => (props.underline ? "border-bottom: 1px dotted black" : "")};

  &:hover .tooltiptext {
    visibility: visible;
  }
`;

const TooltipText = styled.span`
  visibility: hidden;
  width: 200px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 0.5rem;
  border-radius: 6px;

  /* Position the tooltip text - see examples below! */
  position: absolute;
  z-index: 1;

  bottom: 100%;
  left: 50%;
  margin-left: -100px;

  &:after {
    content: " ";
    position: absolute;
    top: 100%; /* At the bottom of the tooltip */
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: black transparent transparent transparent;
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
