import React from "react";

import styled from "@emotion/styled";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const InputEl = styled.input`
  border: 1px solid var(--mi-shade-background-color);
  border-radius: var(--mi-border-radius);
  padding: 0.5rem;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  width: 100%;
  color: var(--mi-normal-foreground-color);
  background-color: var(--mi-lighten-background-color);
`;

export const Input: React.FC<Props> = ({ onChange, ...props }) => {
  return <InputEl onChange={onChange} {...props} />;
};

export default Input;
