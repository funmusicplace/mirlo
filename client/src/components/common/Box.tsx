import { css } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";

import { bp } from "../../constants";

export const ArtistBox: React.FC<{
  variant?: "success" | "info" | "warning";
  compact?: boolean;
  small?: boolean;
  children: React.ReactNode;
}> = (props) => {
  const styles = () => {
    switch (props.variant) {
      case "success":
        return `
        background: var(--mi-text-color) !important;
        color: var(--mi-button-text-color) !important;
        `;
      case "info":
        return `
        background: var(--mi-button-color) !important;
        color: var(--mi-button-text-color) !important;
        `;
      case "warning":
        return `
        background: var(--mi-button-color) !important;
        color: var(--mi-button-text-color) !important;

        a {
          color: var(--mi-button-text-color) !important;
          filter: hue-rotate(90deg);
        }
        `;
      default:
        return "";
    }
  };

  return (
    <Box
      {...props}
      className={css`
        ${styles()}

        p {
          margin-bottom: 0.5rem;
          &:last-child {
            margin-bottom: 0;
          }
        }
      `}
    />
  );
};

const tintedSurface = (color: string) => `
  background-color: color-mix(in srgb, ${color} 30%, var(--mi-background-color));
  border-left: 4px solid ${color};
  border-radius: var(--mi-border-radius);
  color: var(--mi-text-color);
`;

const Box = styled.div<{
  variant?: "success" | "info" | "warning";
  compact?: boolean;
  noPadding?: boolean;
  small?: boolean;
}>`
  width: 100%;
  padding: ${(props) =>
    props?.noPadding ? "0" : props.compact ? ".25rem .5rem" : "1.25rem"};
  border-radius: 5px;

  ${(props) => {
    switch (props.variant) {
      case "success":
        return tintedSurface("var(--mi-success-background-color)");
      case "info":
        return tintedSurface("var(--mi-info-background-color)");
      case "warning":
        return tintedSurface("var(--mi-warning-background-color)");
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}

  ${(props) => (props.small ? "font-size: .85rem" : "")}

  input {
    background: var(--mi-lighten-background-color);
  }

  textarea {
    background: var(--mi-lighten-background-color);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem 0.7rem;
  }
`;

export default Box;
