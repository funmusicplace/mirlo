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

export const InputEl = styled.input`
  border: 1px solid var(--mi-text-color);
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

  &[type="checkbox"] {
    width: auto;
  }
  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-darken-background-color);
    border: var(--mi-border);
  }
`;

export const Input: React.FC<Props> = ({ onChange, ...props }) => {
  return <InputEl onChange={onChange} {...props} />;
};

export default Input;
