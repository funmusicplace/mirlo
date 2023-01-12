import { css } from "@emotion/css";
import React from "react";

export const SmallTileDetails: React.FC<{
  title: string | React.ReactElement;
  subtitle: string | React.ReactElement;
  footer?: string | React.ReactElement;
  moreActions?: React.ReactElement;
}> = ({ title, subtitle, moreActions, footer }) => {
  return (
    <>
      <div
        className={css`
          margin-left: 1rem;
          margin-top: 1rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        <div
          className={css`
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
          `}
        >
          {title}
        </div>
        <div
          className={css`
            color: #444;
            font-size: 1rem;
          `}
        >
          {subtitle}
        </div>
        <div
          className={css`
            color: #444;
            font-size: 0.85rem;
            margin-top: 0.25rem;
            ul > li {
              background-color: transparent;
              margin-left: 0;
              padding-left: 0;
            }
          `}
        >
          {footer}
        </div>
      </div>
      <div
        className={css`
          flex-grow: 1;
          pointer-events: none;
        `}
      />
      {moreActions && (
        <div
          className={css`
            display: flex;
            align-items: center;
            margin-right: 1rem;
          `}
        >
          {moreActions}
        </div>
      )}
    </>
  );
};

export default SmallTileDetails;
