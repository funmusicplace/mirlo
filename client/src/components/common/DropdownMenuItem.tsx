import { css } from "@emotion/css";
import React from "react";
import Button, { ButtonLink } from "./Button";

const dropdownItemStyle = css`
  .startIcon {
    padding-left: 1rem;
  }
`;

type BaseProps = {
  startIcon?: React.ReactElement;
  children?: React.ReactNode;
  className?: string;
};

type ButtonProps = BaseProps &
  Omit<React.ComponentProps<typeof Button>, "size" | "variant">;

export const DropdownMenuItemButton: React.FC<ButtonProps> = ({
  className,
  ...rest
}) => (
  <Button
    size="compact"
    variant="transparent"
    className={
      className ? `${dropdownItemStyle} ${className}` : dropdownItemStyle
    }
    {...rest}
  />
);

type LinkProps = BaseProps &
  Omit<React.ComponentProps<typeof ButtonLink>, "size" | "variant">;

export const DropdownMenuItemLink: React.FC<LinkProps> = ({
  className,
  ...rest
}) => (
  <ButtonLink
    size="compact"
    variant="transparent"
    className={
      className ? `${dropdownItemStyle} ${className}` : dropdownItemStyle
    }
    {...rest}
  />
);
