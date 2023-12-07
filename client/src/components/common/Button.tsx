import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { css } from "@emotion/css";
import { bp } from "../../constants";

export interface Compactable {
  compact?: boolean;
  transparent?: boolean;
  role?: "primary" | "secondary" | "warning";
  variant?: "link" | "outlined";
  color?: string;
  uppercase?: boolean;
  onlyIcon?: boolean;
}

const CustomButton = styled.button<Compactable>`
  background: none;
  border: none;
  transition: 0.25s background-color, 0.25s color, 0.25s border-radius,
    0.25s filter;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1rem;
  height: 1.8rem;
  height: ${(props) => (props.onlyIcon ? "2rem" : "")};
  width: ${(props) => (props.onlyIcon ? "2rem" : "")};

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 0.8rem;
  }
  @media screen and (max-width: ${bp.small}px) {
    font-size: 0.8rem;
  }

  &:hover:not(:disabled) {
    cursor: pointer;
  }

  ${(props) => (props.uppercase ? "text-transform: uppercase;" : "")}
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
          margin-left: .3rem;
          padding: 0 !important;
          height: auto !important;
          width: auto !important;
          background-color: transparent !important;
          font-size: inherit;
          line-height: inherit;

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color)`
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
          border: 1px solid ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "secondary"}-color)`
            };
            background-color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color)`
            };            
            border: 1px solid ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color)`
            };
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }
        `;
      default:
        return `
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          padding: ${props.onlyIcon ? ".5rem .5rem" : ".6rem .6rem"};
          background-color:  var(--mi-${props.role ?? "secondary"}-color);
          background-color:  ${props.transparent ? "transparent" : ""};
          color:  var(--mi-${props.role ?? "primary"}-color);
          color:  ${
            props.transparent ? "var(--mi-normal-foreground-color)" : ""
          };

          &:hover:not(:disabled) {
            background-color: var(--mi-${props.role ?? "primary"}-color);
            color: var(--mi-${props.role ?? "secondary"}-color);
          }

            @media screen and (max-width: ${bp.small}px) {
              font-size: 0.8rem;
              padding: ${props.transparent ? ".5rem .25rem .5rem .25rem" : ""};
            }

        `;
    }
  }}

  &:hover:not(:disabled) {
    filter: saturate(50%);
  }

  align-items: center;
  display: inline-flex;
  border-radius: var(--mi-border-radius);
  border-radius: ${(props) => (props.onlyIcon ? "100%" : "")};
  justify-content: center;
  white-space: nowrap;

  &[disabled] {
    opacity: 0.6;
  }

  & .startIcon:not(.collapsed) {
    margin-top: 0.1rem;
    margin-right: ${(props) => (props.onlyIcon ? "0px" : "0.5rem")};
    line-height: 0.785rem;
    font-size: 0.785rem;
    font-size: ${(props) => (props.onlyIcon ? ".9rem" : "")};
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
  children?: React.ReactNode;
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
  return (
    <CustomButton
      onClick={onClick}
      disabled={disabled}
      onlyIcon={!children}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner
          className={css`
            margin-right: 0.5rem;
            fill: var(--mi-normal-background-color);
          `}
        />
      )}
      {!isLoading && startIcon ? (
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
