import { css } from "@emotion/css";
import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export const FullPageLoadingSpinner: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      className={css`
        display: flex;
        height: 100%;
        justify-content: center;
        align-items: center;
        font-size: 4rem;
        width: 100%;
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
        bottom: 0;
        background-color: var(--mi-shade-background-color);
      `}
    >
      <LoadingSpinner />
    </div>
  );
};

export default FullPageLoadingSpinner;
