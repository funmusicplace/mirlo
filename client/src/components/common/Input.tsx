import React from "react";

import styled from "@emotion/styled";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaDescribedByValue?: string;
}

const StyledInput = styled.input`
  border: 1px solid var(--mi-darken-x-background-color);
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

  &[type="checkbox"] {
    width: auto;
  }
  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-darken-background-color);
    border: var(--mi-border);
  }
`;

export const InputEl = React.forwardRef<
  HTMLInputElement,
  Props & ReturnType<UseFormRegister<IFormValues>>
>(({ id, ariaDescribedByValue, onChange, ...props }, ref) => {
  if (!!id && !!ariaDescribedByValue) {
    const ariaDescribedById = id.concat("-describedby");
    return (
      <>
        <StyledInput
          aria-describedby={ariaDescribedById}
          onChange={onChange}
          ref={ref}
          {...props}
        />
        <p id={ariaDescribedById}>{ariaDescribedByValue}</p>
      </>
    );
  } else {
    return <StyledInput onChange={onChange} {...props} />;
  }
});

export default InputEl;
