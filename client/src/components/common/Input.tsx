import { css } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const StyledInput = styled.input`
  border: 1px solid var(--mi-tint-x-color);
  border-radius: var(--mi-border-radius);
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  width: 100%;
  color: var(--mi-text-color);
  background-color: var(--mi-background-color);
  transition: 0.4s border-radius;

  &[disabled] {
    background-color: var(--mi-darken-background-color);
    border: solid 1px var(--mi-lighten-background-color);
    color: var(--mi-lighter-foreground-color);
  }

  &:focus {
    border-radius: var(--mi-border-radius-focus);
  }

  &[type="checkbox"],
  &[type="radio"] {
    width: auto;
    padding: 0;
    background-color: transparent;
    border: 0;
  }
`;

export const colorInputClass = css`
  &[type="color"] {
    min-height: 2.5rem;
    padding: 2px;
  }

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: calc(var(--mi-border-radius) - 2px);
  }

  &::-moz-color-swatch {
    border: 0;
    border-radius: calc(var(--mi-border-radius) - 2px);
  }
`;

// Wrapping the styled input so that scrolling the mouse wheel over a
// focused number input doesn't accidentally change its value (a common
// browser footgun with type="number"). We blur on wheel for number inputs.
export const InputEl = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ onWheel, ...props }, ref) => {
  return (
    <StyledInput
      ref={ref}
      onWheel={(e) => {
        if (e.currentTarget.type === "number") {
          e.currentTarget.blur();
        }
        onWheel?.(e);
      }}
      {...props}
    />
  );
});

InputEl.displayName = "InputEl";

export const Input: React.FC<Props> = ({ onChange, ...props }) => {
  return <InputEl onChange={onChange} {...props} />;
};

export default Input;
