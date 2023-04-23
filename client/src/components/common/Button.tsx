import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { css } from "@emotion/css";
import { colorShade } from "utils/theme";

export interface Compactable {
  compact?: boolean;
  color?: "primary" | "warning";
  variant?: "link" | "outlined";
}

const CustomButton = styled.button<Compactable>`
  background: none;
  border: none;
  transition: 0.25s background-color, 0.25s color;
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
          color: ${props.theme.colors[props.color ?? "primary"]};
          margin-right: 0;
          font-size: inherit;
          line-height: inherit;

          &:hover:not(:disabled) {
            color: ${colorShade(
              props.theme.colors[props.color ?? "primary"],
              0.5
            )};
          }
        `;
      case "outlined":
        return `
          color:  ${props.theme.colors[props.color ?? "primary"]};
          background-color: transparent;
          border: 2px solid ${props.theme.colors[props.color ?? "primary"]};
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};

          &:hover:not(:disabled) {
            color: ${colorShade(
              props.theme.colors[props.color ?? "primary"],
              0.5
            )};
            border: 2px solid ${colorShade(
              props.theme.colors[props.color ?? "primary"],
              0.5
            )};
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }
        `;
      default:
        return `
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          background-color:  ${props.theme.colors[props.color ?? "primary"]};
          color: ${
            props.color === "primary"
              ? props.theme.colors.text
              : props.theme.colors.textDark
          };
          border: 2px solid ${colorShade(
            props.theme.colors[props.color ?? "primary"],
            1
          )};

          &:hover:not(:disabled) {
            border: 2px solid ${props.theme.colors[props.color ?? "primary"]};
            background-color: ${colorShade(
              props.theme.colors[props.color ?? "primary"],
              -70
            )};
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

  & .startIcon {
    margin-top: 0.1rem;
    margin-right: 0.5rem;
    line-height: 0.785rem;
  }

  & .endIcon {
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
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  startIcon,
  endIcon,
  disabled,
  isLoading,
  ...props
}) => {
  return (
    <CustomButton onClick={onClick} disabled={disabled} {...props}>
      {isLoading && (
        <LoadingSpinner
          className={css`
            margin-right: 0.5rem;
          `}
        />
      )}
      {startIcon ? <span className="startIcon">{startIcon}</span> : ""}
      {children}
      {endIcon ? <span className="endIcon">{endIcon}</span> : ""}
    </CustomButton>
  );
};

export default Button;
