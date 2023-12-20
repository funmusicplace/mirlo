import { css } from "@emotion/css";
import { bp } from "../../constants";
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
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-right: 0.5rem;
          padding-left: 1rem;
          width: 100%;
          height: 100%;
          > div {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: wrap;
          }
        `}
      >
        <div
          className={css`
            margin-bottom: 0.5rem;
            font-size: 1.6rem;

            @media screen and (max-width: ${bp.medium}px) {
              font-size: 1.2rem;
            }
            @media screen and (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-normal);
            }
          `}
        >
          {title}
        </div>
        <div
          className={css`
            color: var(--mi-normal-foreground-color);
            font-size: 1rem;
            margin-bottom: 1rem;
            span:first-child {
              opacity: 0.5;
            }
            span:last-child {
              opacity: 0.9;
            }
            @media screen and (max-width: ${bp.medium}px) {
              font-size: var(--mi-font-size-small);
            }

            @media screen and (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-xsmall);
            }
          `}
        >
          <span>from </span>
          <span>"{subtitle}"</span>
        </div>
        <div
          className={css`
            color: var(--mi-normal-foreground-color);
            font-size: 0.85rem;
            margin-top: 0.25rem;
            ul > li {
              background-color: transparent;
              margin-left: 0;
              padding-left: 0;
            }

            @media screen and (max-width: ${bp.medium}px) {
              font-size: var(--mi-font-size-small);
            }

            @media screen and (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-xsmall);
            }
          `}
        >
          {"by"} {footer}
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
