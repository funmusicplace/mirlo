/** @jsxImportSource @emotion/react */
import { css as reactCss } from "@emotion/react"
import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export const FullPageLoadingSpinner: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      css={(theme) => reactCss`
        display: flex;
        height: 100%;
        justify-content: center;
        align-items: center;
        font-size: 4rem;
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
        bottom: 0;
        background-color: ${theme.colors.translucentShade};
      `}
    >
      <LoadingSpinner />
    </div>
  );
};

export default FullPageLoadingSpinner;
