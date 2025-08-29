import { css } from "@emotion/css";
import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

export const LoadingSpinner: React.FC<{
  className?: string;
  fill?: string;
  size?: "small" | "medium" | "large";
}> = ({ className, fill, size }) => {
  return (
    <AiOutlineLoading
      className={
        css`
          fill: ${fill ?? "var(--mi-normal-foreground-color)"};
          animation-name: spinning;
          animation-duration: 0.5s;
          animation-iteration-count: infinite;
          /* linear | ease | ease-in | ease-out | ease-in-out */
          animation-timing-function: linear;
        ` + ` ${className}`
      }
      style={{
        width: size === "small" ? "1em" : size === "medium" ? "2em" : "3em",
        height: size === "small" ? "1em" : size === "medium" ? "2em" : "3em",
      }}
    />
  );
};

export default LoadingSpinner;
