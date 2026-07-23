import styled from "@emotion/styled";
import React from "react";

const StyledPill = styled.span<{
  isHoverable?: boolean;
  variant?: "warning" | "tint" | "cover";
}>`
  display: inline-flex;
  background-color: var(--mi-lighten-x-background-color);
  border-radius: var(--mi-border-radius-x);
  border: var(--mi-border);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  align-items: center;
  transition: 0.25s background-color;

  button {
    margin-left: 0.25rem;
    padding: 0;
    font-size: 0.8rem;
    height: 2rem;
    width: 2rem;
  }
  ${(props) => {
    switch (props.variant) {
      case "tint":
        return `
            background-color: var(--mi-button-tint-color);
          `;
      case "cover":
        return `
            background-color: color-mix(in srgb, var(--mi-black) 80%, transparent);
            color: var(--mi-white);
            border-color: color-mix(in srgb, var(--mi-white) 25%, transparent);
          `;
      case "warning":
        return `
            background: repeating-linear-gradient(45deg, 
              var(--mi-lighten-background-color), 
              var(--mi-lighten-background-color) 10px, 
              var(--mi-background-color) 10px, 
              var(--mi-background-color) 20px);
            border: var(--mi-warning-background-color) 1px solid;
            color: var(--mi-text-color);
            font-weight: bold;
          `;
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}
  ${(props) =>
    props.isHoverable
      ? props.variant === "tint"
        ? `
  &:hover {
    background-color: var(--mi-button-tint-x-color);
  }
  `
        : props.variant === "cover"
          ? `
  &:hover {
    background-color: color-mix(in srgb, var(--mi-black) 60%, transparent);
  }
  `
          : `
  &:hover {
    background-color: var(--mi-darken-background-color);
  }
  `
      : ``}
`;

type PillProps = React.ComponentProps<typeof StyledPill>;

const tintHighContrastClass =
  "[[data-mi-high-contrast]_&]:bg-(--mi-chip-background-color)! [[data-mi-high-contrast]_&]:text-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:border! [[data-mi-high-contrast]_&]:border-(--mi-chip-border-color)! [[data-mi-high-contrast]_&]:[&_button]:text-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:[&_button]:bg-transparent! [[data-mi-high-contrast]_&]:[&_button]:border [[data-mi-high-contrast]_&]:[&_button]:border-dashed [[data-mi-high-contrast]_&]:[&_button]:border-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:[&_button_svg]:fill-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:text-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:bg-(--mi-button-tint-x-color)! [[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:border-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)_svg]:fill-(--mi-chip-text-color)!";

const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ variant, className, ...props }, ref) => (
    <StyledPill
      ref={ref}
      variant={variant}
      className={[variant === "tint" && tintHighContrastClass, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  )
);

Pill.displayName = "Pill";

export default Pill;
