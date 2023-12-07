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
  border: 1px solid var(--mi-darken-background-color);
  border-radius: var(--mi-border-radius);
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  width: 100%;
  color: var(--mi-normal-foreground-color);
  background-color: var(--mi-lighten-x-background-color);
  transition: 0.4s border-radius;

  &[disabled] {
    background-color: var(--mi-darken-background-color);
    border: solid 1px var(--mi-lighten-background-color);
    color: var(--mi-lighter-foreground-color);
  }

  &:focus {
    border-radius: var(--mi-border-radius-focus);
  }
`;

export const Input: React.FC<Props> = ({ onChange, ...props }) => {
  return <InputEl onChange={onChange} {...props} />;
};

export default Input;
