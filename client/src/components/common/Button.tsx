import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { css } from "@emotion/css";

export interface Compactable {
  compact?: boolean;
  color?: "primary";
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
          color: ${props.theme.colors.primary};
          margin-right: 0;
          font-size: inherit;
          line-height: inherit;

          &:hover:not(:disabled) {
            color: ${props.theme.colors.primaryHighlight};
          }
        `;
      case "outlined":
        return `
          color:  ${props.theme.colors.primary};
          background-color: transparent;
          border: 2px solid  ${props.theme.colors.primary};
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};

          &:hover:not(:disabled) {
            color: ${props.theme.colors.primaryHighlight};
            border: 2px solid ${props.theme.colors.primaryHighlight};
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }
        `;
      default:
        return `
          padding: ${props.compact ? ".3rem .5rem" : "1rem"};
          background-color:  ${props.theme.colors.primary};
          color: ${props.theme.colors.text};
          border: 2px solid ${props.theme.colors.primary};

          &:hover:not(:disabled) {
            border: 2px solid ${props.theme.colors.primary};
            background-color: ${props.theme.colors.primaryHighlight};
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
