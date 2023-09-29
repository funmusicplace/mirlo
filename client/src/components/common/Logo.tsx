import React from "react";
import { css } from "@emotion/css";
import { bp } from "../../constants";
import { ReactComponent as ReactLogo } from "./../Header/logo.svg";

export const Logo: React.FC<{ collapse?: boolean }> = ({
  collapse = false,
}) => {
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
      `}
    >
      <ReactLogo
        className={css`
          max-height: 2rem;
          max-width: 3rem;
          margin-right: 0.75rem;
        `}
      />
      <span
        className={css`
          ${collapse ? "display: none;" : "display: inline-block;"}
          font-family: "Roboto Slab", serif;
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--mi-normal-foreground-color);

          @media (min-width: ${bp.small}px) {
            display: inline-block;
          }
        `}
      >
        mirlo
      </span>
    </div>
  );
};

export default Logo;
