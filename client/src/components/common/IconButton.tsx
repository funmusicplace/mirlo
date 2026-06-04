import styled from "@emotion/styled";
import { css } from "@emotion/react";
import React from "react";
import {
  RelativeRoutingType,
  useHref,
  useLinkClickHandler,
} from "react-router-dom";

import LoadingSpinner from "./LoadingSpinner";

interface IconButtonProps {
  label: string; // passed to `aria-label` and `title`
  children: React.ReactNode;
  buttonRole?: "primary" | "warning" | "black";
  isLoading?: boolean;
  size?: "big" | "compact";
  variant?: "link" | "outlined" | "dashed" | "transparent" | "default" | "pill";
}

type StyledIconButtonProps = Omit<IconButtonProps, "label">;

const stylesIconButton = css`
  padding: 0.5rem;
  height: 2rem;
  width: 2rem;
  border-radius: 100%;

  @media screen and (max-width: var(--breakpoint-md)) {
    width: var(--mi-touch-target-min);
    height: var(--mi-touch-target-min);
    padding: 0;
  }
`;

const stylesSizeSmall = css`
  line-height: 1.2rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
  svg {
    width: 0.6rem;
  }
`;

const stylesSizeMedium = css`
  padding: 0.5rem 0.7rem;
  font-size: 1rem;
`;

const stylesSizeLarge = css`
  line-height: 1.2rem;
  padding: 1rem 1.3rem;
  font-size: 1.2rem;
`;

const stylesButtonRolePrimary = css`
  color: var(--mi-button-color);
  svg {
    fill: var(--mi-button-color);
  }
`;

const stylesButtonRoleWarning = css`
  color: var(--mi-warning-color);
  svg {
    fill: var(--mi-warning-color);
  }
`;

const stylesButtonRoleBlack = css`
  color: var(--mi-black-color);
  svg {
    fill: var(--mi-black-color);
  }
`;

const stylesButtonRolePrimaryVariantLink = css`
  color: var(--mi-button-color);
  svg {
    fill: var(--mi-button-color);
  }
`;

const stylesButtonRoleWarningVariantLink = css`
  color: var(--mi-warning-color);
  svg {
    fill: var(--mi-warning-color);
  }
`;

const stylesButtonRoleBlackVariantLink = css`
  color: var(--mi-black-color);
  svg {
    fill: var(--mi-black-color);
  }
`;

const stylesVariantLink = css`
  font-size: inherit;
  padding: 0 !important;
  background-color: transparent !important;
  text-decoration: underline;
  line-height: inherit;
  min-width: auto;
  min-height: auto;

  &:hover:not(:disabled) {
    filter: brightness(80%) saturate(30%);
  }
`;

const stylesButtonRolePrimaryVariantBorderBase = css`
  border-color: var(--mi-button-color);
  color: var(--mi-button-color);
  svg {
    fill: var(--mi-button-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-button-color);
    svg {
      fill: var(--mi-button-color);
    }
  }
`;

const stylesButtonRoleWarningVariantBorderBase = css`
  border-color: var(--mi-warning-color);
  color: var(--mi-warning-color);
  svg {
    fill: var(--mi-warning-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-warning-color);
    svg {
      fill: var(--mi-warning-color);
    }
  }
`;

const stylesButtonRoleBlackVariantBorderBase = css`
  border-color: var(--mi-black-color);
  color: var(--mi-black-color);
  svg {
    fill: var(--mi-black-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-black-color);
    svg {
      fill: var(--mi-black-color);
    }
  }
`;

const stylesVariantBorderBase = css`
  background-color: transparent;
  border-width: 1px;
  font-weight: bold;

  &:hover:not(:disabled) {
    background-color: var(--mi-button-text-color);
  }

  &[disabled] {
    color: #ddd;
    border-color: #ddd;
  }
`;

const stylesVariantBorderOutlined = css`
  border-style: solid;
`;

const stylesVariantBorderDashed = css`
  border-style: dashed;
`;

const stylesVariantPill = css`
  color: currentColor;
  background-color: transparent;
  border: 1px solid;
  border-color: color-mix(in srgb, currentColor 40%, transparent);
  font-weight: 500;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.25rem 0.625rem !important;
  border-radius: 9999px !important;

  svg {
    fill: currentColor;
  }

  &:hover:not(:disabled) {
    border-color: currentColor;
    background-color: transparent;
  }

  &[disabled] {
    opacity: 0.6;
  }
`;

const stylesButtonRolePrimaryVariantTransparent = css`
  color: var(--mi-button-color);
  svg {
    fill: var(--mi-button-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-button-color);
    svg {
      fill: var(--mi-button-color);
    }
  }
`;

const stylesButtonRoleWarningVariantTransparent = css`
  color: var(--mi-warning-color);
  svg {
    fill: var(--mi-warning-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-warning-color);
    svg {
      fill: var(--mi-warning-color);
    }
  }
`;

const stylesButtonRoleBlackVariantTransparent = css`
  color: var(--mi-black-color);
  svg {
    fill: var(--mi-black-color);
  }
  &:hover:not(:disabled) {
    color: var(--mi-black-color);
    svg {
      fill: var(--mi-black-color);
    }
  }
`;

const stylesVariantTransparent = css`
  background-color: transparent;
  font-weight: bold;

  &:hover:not(:disabled) {
    background-color: var(--mi-button-text-color);
  }

  &[disabled] {
    color: #ddd;
    border-color: #ddd;
  }
`;

const stylesButtonRolePrimaryVariantDefault = css`
  background-color: var(--mi-button-color);
`;

const stylesButtonRoleWarningVariantDefault = css`
  background-color: var(--mi-warning-color);
`;

const stylesButtonRoleBlackVariantDefault = css`
  background-color: var(--mi-black-color);
`;

const stylesVariantDefault = css`
  background-color: var(--mi-button-color);
  color: var(--mi-button-text-color);

  svg {
    fill: var(--mi-button-text-color);
  }

  &:hover:not(:disabled) {
    filter: brightness(95%) saturate(30%);
  }
`;

const stylesRounded = css`
  border-radius: 0.5rem !important;
`;

const stylesBase = css`
  border: none;
  transition:
    0.25s background-color,
    0.25s color,
    0.25s border-radius,
    0.25s opacity,
    0.25s filter 0.25s fill;
  text-decoration: none;

  &:hover:not(:disabled) {
    cursor: pointer;
  }

  align-items: center;
  display: flex;
  border-radius: var(--mi-border-radius);
  justify-content: center;
  min-width: var(--mi-touch-target-min);
  min-height: var(--mi-touch-target-min);

  &[disabled] {
    opacity: 0.6;
  }
`;

const allStyles = (props: StyledIconButtonProps) => css`
  ${stylesBase}
  ${stylesIconButton}
	${props.size === "compact" && stylesSizeSmall}
	${!props.size && stylesSizeMedium}
	${props.size === "big" && stylesSizeLarge}
	${props.variant === "link" && stylesVariantLink}
	${(props.variant === "outlined" || props.variant === "dashed") &&
  stylesVariantBorderBase}
	${props.variant === "outlined" && stylesVariantBorderOutlined}
	${props.variant === "dashed" && stylesVariantBorderDashed}
	${!props.variant && stylesVariantDefault}
	${props.variant === "pill" && stylesVariantPill}
	${props.variant === "transparent" && stylesVariantTransparent}
	${props.buttonRole === "primary" &&
  props.variant === "link" &&
  stylesButtonRolePrimaryVariantLink}
	${props.buttonRole === "warning" &&
  props.variant === "link" &&
  stylesButtonRoleWarningVariantLink}
	${props.buttonRole === "black" &&
  props.variant === "link" &&
  stylesButtonRoleBlackVariantLink}
	${props.buttonRole === "primary" &&
  !props.variant &&
  stylesButtonRolePrimaryVariantDefault}
	${props.buttonRole === "warning" &&
  !props.variant &&
  stylesButtonRoleWarningVariantDefault}
	${props.buttonRole === "black" &&
  !props.variant &&
  stylesButtonRoleBlackVariantDefault}
	${props.buttonRole === "primary" &&
  props.variant === "transparent" &&
  stylesButtonRolePrimaryVariantTransparent}
	${props.buttonRole === "warning" &&
  props.variant === "transparent" &&
  stylesButtonRoleWarningVariantTransparent}
	${props.buttonRole === "black" &&
  props.variant === "transparent" &&
  stylesButtonRoleBlackVariantTransparent}
	${props.buttonRole === "primary" &&
  (props.variant === "outlined" || props.variant === "dashed") &&
  stylesButtonRolePrimaryVariantBorderBase}
	${props.buttonRole === "warning" &&
  (props.variant === "outlined" || props.variant === "dashed") &&
  stylesButtonRoleWarningVariantBorderBase}
	${props.buttonRole === "black" &&
  (props.variant === "outlined" || props.variant === "dashed") &&
  stylesButtonRoleBlackVariantBorderBase}
`;

const StyledIconButton = styled.button<StyledIconButtonProps>`
  ${allStyles}
`;

const StyledIconButtonAnchor = styled.a<StyledIconButtonProps>`
  ${allStyles}
`;

const IconButtonChildren = (
  props: Pick<IconButtonProps, "children" | "isLoading">
) => {
  const { children, isLoading } = props;
  return (
    <>
      {isLoading && (
        <span className="startIcon" aria-hidden>
          <LoadingSpinner size="small" />
        </span>
      )}
      {!isLoading && children}
    </>
  );
};

export const IconButton = (
  props: React.ComponentPropsWithRef<"button"> & IconButtonProps
) => {
  const { children, isLoading, label, ...rootProps } = props;
  const childrenProps = { children, isLoading };
  return (
    <StyledIconButton aria-label={label} title={label} {...rootProps}>
      <IconButtonChildren {...childrenProps} />
    </StyledIconButton>
  );
};

export const IconButtonAnchor = (
  props: React.ComponentPropsWithRef<"a"> & IconButtonProps
) => {
  const { children, isLoading, label, ...rootProps } = props;
  const childrenProps = { children, isLoading };
  return (
    <StyledIconButtonAnchor aria-label={label} title={label} {...rootProps}>
      <IconButtonChildren {...childrenProps} />
    </StyledIconButtonAnchor>
  );
};

export const IconButtonLink = ({
  to,
  relative,
  ...props
}: React.ComponentPropsWithRef<"a"> &
  IconButtonProps & {
    to: string;
    relative?: RelativeRoutingType;
  }) => {
  const handleClick = useLinkClickHandler(to, { relative });
  const href = useHref(to, { relative });
  return <IconButtonAnchor onClick={handleClick} href={href} {...props} />;
};
