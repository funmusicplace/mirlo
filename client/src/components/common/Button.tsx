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
              : (props.role === "warning" && props.theme.colors.warning) ||
                props.theme.colors.primary
          };
          margin-right: 0;
          font-size: inherit;
          line-height: inherit;

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : (props.role === "warning" && props.theme.colors.warning) ||
                  props.theme.colors.primary
            };
          }
        `;
      case "outlined":
        return `
          color: ${
            props.color
              ? props.color
              : (props.role === "warning" && props.theme.colors.warning) ||
                props.theme.colors.primary
          };
          background-color: transparent;
          border: 2px solid ${
            props.color
              ? props.color
              : (props.role === "warning" && props.theme.colors.warning) ||
                props.theme.colors.primary
          };
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : (props.role === "warning" && props.theme.colors.warning) ||
                  props.theme.colors.primary
            };
            border: 2px solid ${
              props.color
                ? props.color
                : (props.role === "warning" && props.theme.colors.warning) ||
                  props.theme.colors.primary
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
              : (props.role === "warning" && props.theme.colors.warning) ||
                (props.role === "primary" && props.theme.colors.pink.main) ||
                (props.role === "secondary" &&
                  (props.theme.type === "dark"
                    ? props.theme.colors.white
                    : props.theme.colors.black))
          };
          color: ${
            (props.role === "warning" && props.theme.colors.white) ||
            (props.role === "primary" && props.theme.colors.white) ||
            (props.role === "secondary" &&
              (props.theme.type === "dark"
                ? props.theme.colors.black
                : props.theme.colors.white))
          };

          &:hover:not(:disabled) {
            background-color: ${
              props.color
                ? props.color
                : (props.role === "warning" && props.theme.colors.warning) ||
                  props.theme.colors.primary
            };
          }

        `;
    }
  }}

  align-items: center;
  display: inline-flex;
  border-radius: ${(props) => props.theme.borderRadius};
  justify-content: center;
  white-space: nowrap;

  &[disabled] {
    opacity: 0.6;
  }

  & .startIcon:not(.collapsed) {
    margin-top: 0.1rem;
    margin-right: 0.5rem;
    line-height: 0.785rem;
  }

  & .endIcon:not(.collapsed) {
    margin-top: 0.1rem;
    margin-left: 0.5rem;
    line-height: 0.785rem;
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
      role={role || "primary"}
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
