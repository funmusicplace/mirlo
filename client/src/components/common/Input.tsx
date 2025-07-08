import React from "react";

import styled from "@emotion/styled";
import { useGetArtistColors } from "components/Artist/ArtistButtons";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const InputEl = styled.input<{
  colors?: { background: string; foreground: string };
}>`
  border: 1px solid
    ${(props) =>
      props.colors?.foreground ?? "var(--mi-lighten-foreground-color)"};
  border-radius: var(--mi-border-radius);
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  width: 100%;
  color: ${(props) =>
    props.colors?.foreground ?? "var(--mi-normal-foreground-color)"};
  background-color: ${(props) =>
    props.colors?.background ?? "var(--mi-lighten-x-background-color)"};
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
