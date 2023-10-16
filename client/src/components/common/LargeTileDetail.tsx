/** @jsxImportSource @emotion/react */
import { css } from "@emotion/css";
import { css as reactCss } from "@emotion/react"
import React from "react";

export const SmallTileDetails: React.FC<{
  title: string | React.ReactElement;
  subtitle?: string | React.ReactElement | null;
  moreActions?: React.ReactElement;
}> = ({ title, subtitle, moreActions }) => {
  return (
    <div
      className={css`
        display: flex;
        margin: 0.5rem 0;
        justify-content: space-between;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <span
          className={css`
            font-size: 1.1rem;
          `}
        >
          {title}
        </span>
        {subtitle && (
          <span
            css={(theme) => reactCss`
              margin-top: 0.5rem;
              color: ${theme.colors.text};
              text-decoration: none;
            `}
          >
            {subtitle}
          </span>
        )}
      </div>
      {moreActions && (
        <div
          className={css`
            display: flex;
            align-items: center;
          `}
        >
          {moreActions}
        </div>
      )}
    </div>
  );
};

export default SmallTileDetails;
