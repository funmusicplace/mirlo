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
      `}
    >
      <LoadingSpinner />
    </div>
  );
};

export default FullPageLoadingSpinner;
