import { css } from "@emotion/css";
import { bp } from "../../constants";
import React from "react";
import styled from "@emotion/styled";
import { Trans } from "react-i18next";

const WidgetSection = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: wrap;

  @media screen and (max-width: ${bp.small}px) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const SmallTileDetails: React.FC<{
  title: string | React.ReactElement;
  subtitle: string | React.ReactElement;
  footer?: string | React.ReactElement;
  moreActions?: React.ReactElement;
  textColor?: string;
}> = ({
  title,
  subtitle,
  moreActions,
  footer,
  textColor = "var(--mi-normal-foreground-color)",
}) => {
  return (
    <>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-right: 0.5rem;
          padding-left: 1rem;
          width: 100%;
          height: 100%;

          @media screen and (max-width: ${bp.small}px) {
            padding-top: 0.5rem;
          }
        `}
      >
        <WidgetSection
          className={css`
            margin-bottom: 0.5rem;
            font-size: 1.6rem;

            @media screen and (max-width: ${bp.medium}px) {
              font-size: 1.2rem;
            }
            @media screen and (max-width: ${bp.small}px) {
              font-size: var(--mi-font-size-normal);
              margin-bottom: 0.25rem;
            }
          `}
        >
          {title}
        </WidgetSection>
        {subtitle && (
          <WidgetSection
            className={css`
              color: ${textColor};
              font-size: 1rem;
              margin-bottom: 1rem;
              span:first-of-type {
                opacity: 0.9;
              }
              span:last-child {
                opacity: 0.9;
              }
              @media screen and (max-width: ${bp.medium}px) {
                font-size: var(--mi-font-size-small);
              }

              @media screen and (max-width: ${bp.small}px) {
                font-size: var(--mi-font-size-xsmall);
                margin-bottom: 0.25rem;
              }
            `}
          >
            <Trans
              ns="translation"
              i18nKey="smallTileDetails.subtitle"
              components={{
                label: <span />,
                subtitle: <>{subtitle}</>,
              }}
            />
          </WidgetSection>
        )}
        {footer && (
          <WidgetSection
            className={css`
              color: ${textColor};
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
                margin-bottom: 0.5rem;
              }
            `}
          >
            <Trans
              ns="translation"
              i18nKey="smallTileDetails.footer"
              components={{
                label: <span />,
                footer: <>{footer}</>,
              }}
            />
          </WidgetSection>
        )}
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
