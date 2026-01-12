import styled from "@emotion/styled";
import React from "react";

export const SelectEl = styled.select`
  font-size: 0.85rem;
  max-width: 100%;
  padding: 0.4rem;
  background-color: var(--mi-background-color);
  backdrop-filter: brightness(95%);
  option {
    padding: 0.4rem;
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
