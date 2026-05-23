import styled from "@emotion/styled";
import React from "react";

export const SelectEl = styled.select`
  border: 1px solid var(--mi-tint-x-color);
  border-radius: var(--mi-border-radius);
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  max-width: 100%;
  color: var(--mi-text-color);
  background-color: var(--mi-background-color);
  transition: 0.4s border-radius;

  &:focus {
    border-radius: var(--mi-border-radius-focus);
  }

  &[disabled] {
    background-color: var(--mi-darken-background-color);
    border: solid 1px var(--mi-lighten-background-color);
    color: var(--mi-lighter-foreground-color);
  }

  option {
    padding: 0.4rem;
  }

  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-darken-background-color);
    border: var(--mi-border);
  }
`;

export const Select: React.FC<{
  value: string;
  style?: React.CSSProperties;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: { label: string; value: string }[];
  disabled?: boolean;
}> = ({ disabled, value, onChange, options, style }) => {
  return (
    <SelectEl
      value={value}
      onChange={onChange}
      style={style}
      disabled={disabled}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectEl>
  );
};

export default Select;
