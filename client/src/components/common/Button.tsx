import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { css } from "@emotion/css";
import { bp } from "../../constants";

export interface Compactable {
  compact?: boolean;
  transparent?: boolean;
  thin?: boolean;
  wrap?: boolean;
  collapsible?: boolean;
  role?: "primary" | "secondary" | "warning";
  variant?: "link" | "big" | "outlined" | "dashed" | "default";
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
  line-height: 1rem;
  height: 2rem;
  ${(props) => (props.onlyIcon ? "height: 2rem;" : "")};
  ${(props) => (props.onlyIcon ? "width: 2rem;" : "")};

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 0.8rem;
  }
  @media screen and (max-width: ${bp.small}px) {
    font-size: 0.8rem;
    ${(props) =>
      props.onlyIcon && props.compact
        ? "height: 1.7rem; width: 1.7rem; font-size: var(--mi-font-size-xsmall);"
        : ""};
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
          font-weight: bold;
          padding: 0 !important;
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

      case "big":
        return `
        
          color: ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          ${props.compact ? "" : "height: 2.5rem; min-width: 5rem;"}
          border-radius: 9999px !important;
          background-color: var(--mi-secondary-color);
          font-weight: bold;
          align-items: center;
          display: inline-flex;
          line-height: 1rem;
          padding: 1rem;
          text-decoration: none;
          text-align: center;

          &:hover:not(:disabled) {
            color: ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "secondary"}-color)`
            };
            background-color:  ${
              props.color
                ? props.color
                : `var(--mi-${props.role ?? "primary"}-color)`
            };
          }
          
          @media screen and (max-width: ${bp.small}px) {
            font-size: var(--mi-font-size-normal);
            ${
              props.compact
                ? "padding: .5rem; height: 1.5rem !important;"
                : "height: 2rem;"
            };
          }
        `;
      case "outlined":
      case "dashed":
        return `
          color: ${
            props.color
              ? props.color
              : `var(--mi-${props.role ?? "primary"}-color)`
          };
          background-color: var(--mi-lighten-background-color);
          border: 1px ${props.variant === "dashed" ? "dashed" : "solid"} ${
          props.color
            ? props.color
            : `var(--mi-${props.role ?? "primary"}-color)`
        };
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          font-weight: bold; 

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
            border: 1px ${props.variant === "dashed" ? "dashed" : "solid"} ${
          props.color
            ? props.color
            : `var(--mi-${props.role ?? "primary"}-color)`
        };
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }
          @media screen and (max-width: ${bp.small}px) {
           ${
             props.compact && props.onlyIcon
               ? "height: 1.5rem; width: 1.5rem;"
               : ""
           }
           ${props.compact ? "height: 1.5rem;" : ""}           
          }
        `;
      default:
        return `
          ${
            props.wrap
              ? "white-space: wrap !important; height: auto; line-height:  1.2rem; width: 100%;"
              : ""
          };
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          padding: ${props.onlyIcon ? ".5rem .5rem" : ".6rem .6rem"};
          background-color:  var(--mi-${props.role ?? "secondary"}-color);
          
          ${
            props.transparent
              ? "background-color:  transparent; font-weight: bold;"
              : ""
          };
          ${props.thin ? "font-weight: normal !important;" : ""};          
          color:  var(--mi-${props.role ?? "primary"}-color);
          color:  ${
            props.transparent ? "var(--mi-normal-foreground-color)" : ""
          };

          &:hover:not(:disabled) {
            background-color: var(--mi-${props.role ?? "primary"}-color);
            color: var(--mi-${props.role ?? "secondary"}-color);
          }
          @media screen and (max-width: ${bp.medium}px) {
              ${props.collapsible ? "border-radius: 100%;" : ""}
              ${props.collapsible ? "> p {display: none;}" : ""}
              ${props.collapsible ? "> span {margin: auto !important;} " : ""}
          }
          
          @media screen and (max-width: ${bp.small}px) {
            font-size: var(--mi-font-size-normal);
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

  @media screen and (max-width: ${bp.small}px) {
  & .startIcon:not(.collapsed) {
    font-size: ${(props) =>
      props.onlyIcon ? "var(--mi-font-size-xsmall)" : ""};
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
  title?: string;
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
