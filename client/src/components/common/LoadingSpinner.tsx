import { css } from "@emotion/css";
import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

export const LoadingSpinner = () => {
  return (
    <AiOutlineLoading
      className={css`
        animation-name: spinning;
        animation-duration: 0.5s;
        animation-iteration-count: infinite;
        /* linear | ease | ease-in | ease-out | ease-in-out */
        animation-timing-function: linear;
      `}
    />
  );
};

export default LoadingSpinner;
