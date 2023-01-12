import styled from "@emotion/styled";
import React from "react";

export const SelectEl = styled.select`
  font-size: 1rem;
`;

export const Select: React.FC<{
  value: string;
  style?: React.CSSProperties;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: { label: string; value: string }[];
}> = ({ value, onChange, options, style }) => {
  return (
    <SelectEl value={value} onChange={onChange} style={style}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectEl>
  );
};

export default Select;
