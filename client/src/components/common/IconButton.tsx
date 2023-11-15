import styled from "@emotion/styled";
import { Compactable } from "./Button";

const IconButton = styled.button<Compactable & { transparent?: boolean }>`
  border: none;
  color: ${(props) =>
    props.role === "primary"
      ? "var(--mi-primary-color)"
      : "var(--mi-lighter-foreground-color)"};
  background-color: var(--mi-darken-background-color);
  padding: ${(props) => (props.compact ? "0.5rem 0.6rem" : "0.6rem 0.7rem")};
  transition: 0.25s;
  font-size: ${(props) => (props.compact ? ".9rem" : "1.2rem")};
  line-height: 0.9;
  border-radius: 100%;

  &:hover:not([disabled]) {
    cursor: pointer;
    color: ${(props) =>
      props.role === "primary"
        ? "var(--mi-primary-color)"
        : "var(--mi-lighter-foreground-color)"};
    background-color: var(--mi-icon-button-background-color);
  }

  & svg {
    display: block;
    // height: 1rem;
  }
`;

export default IconButton;
