import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { css } from "@emotion/css";
import { useArtistContext } from "state/ArtistContext";

export interface Compactable {
  compact?: boolean;
  role?: "primary" | "secondary" | "warning";
  variant?: "link" | "outlined";
  color?: string;
}

const CustomButton = styled.button<Compactable>`
  background: none;
  border: none;
  transition: 0.25s background-color, 0.25s color, 0.4s border-radius;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1rem;

  &:hover:not(:disabled) {
    cursor: pointer;
  }

  ${(props) => {
    switch (props.variant) {
      case "link":
        return `
          color: ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          margin-right: 0;
          font-size: inherit;
          line-height: inherit;

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color--hover)`
            };
          }
        `;
      case "outlined":
        return `
          color: ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          background-color: transparent;
          border: 2px solid ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color--hover)`
            };
            border: 2px solid ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color--hover)`
            };
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }

          @media (prefers-color-scheme: dark) {
            color: #F27D98;
            &:hover:not(:disabled) {
              color: #F27D98;
            }
          }
        `;
      default:
        return `
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          background-color:  ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          color: ${
            props.role === "primary"
              ? props.theme.colors.text
              : props.theme.colors.textDark
          };

          &:hover:not(:disabled) {
            background-color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color--hover)`
            };
          }

        `;
    }
  }}

  align-items: center;
  display: inline-flex;
  border-radius: var(--mi-border-radius);
  justify-content: center;
  white-space: nowrap;

  &[disabled] {
    opacity: 0.6;
  }

  & .startIcon:not(.collapsed) {
    margin-top: 0.1rem;
    margin-right: 0.5rem;
    line-height: 0.785rem;
    font-size: 0.785rem;
  }

  & .endIcon:not(.collapsed) {
    margin-top: 0.1rem;
    margin-left: 0.5rem;
    line-height: 0.785rem;
    font-size: 0.785rem;
  }
`;

export interface ButtonProps extends Compactable {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  startIcon?: React.ReactElement;
  endIcon?: React.ReactElement;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  isLoading?: boolean;
  collapse?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  startIcon,
  endIcon,
  disabled,
  isLoading,
  collapse,
  role,
  ...props
}) => {
  const artistContext = useArtistContext();

  const artistColor =
    artistContext?.state?.isArtistContext &&
    artistContext?.state?.artist?.properties?.colors;

  return (
    <CustomButton
      onClick={onClick}
      disabled={disabled}
      color={
        artistColor ? (artistColor as any)?.[role ?? "primary"] : undefined
      }
      {...props}
    >
      {isLoading && (
        <LoadingSpinner
          className={css`
            margin-right: 0.5rem;
          `}
        />
      )}
      {startIcon ? (
        <span className={`startIcon ${collapse ? "collapsed" : ""}`}>
          {startIcon}
        </span>
      ) : (
        ""
      )}
      {!collapse && children}
      {endIcon ? <span className="endIcon">{endIcon}</span> : ""}
    </CustomButton>
  );
};

export default Button;
