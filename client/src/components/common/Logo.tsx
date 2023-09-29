import React from "react";
import { css } from "@emotion/css";
import { bp } from "../../constants";
import { ReactComponent as ReactLogo } from "./../Header/logo.svg";

export const Logo = () => {
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
          display: none;
          font-family: "Roboto Slab", serif;
          font-size: 1.5rem;
          font-weight: 600;
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
