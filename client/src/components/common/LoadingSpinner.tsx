/** @jsxImportSource @emotion/react */
import { css as reactCss } from "@emotion/react";
import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

export const LoadingSpinner: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <AiOutlineLoading
      css={(theme) => reactCss`
        fill: ${theme.colors.primary};
        animation-name: spinning;
        animation-duration: 0.5s;
        animation-iteration-count: infinite;
        /* linear | ease | ease-in | ease-out | ease-in-out */
        animation-timing-function: linear;
      `}
      className={className}
    />
  );
};

export default LoadingSpinner;
