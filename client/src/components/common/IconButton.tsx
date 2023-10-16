import styled from "@emotion/styled";
import { Compactable } from "./Button";

const IconButton = styled.button<Compactable & { transparent?: boolean }>`
  border: none;
  color: ${(props) =>
    props.role === "primary" ? props.theme.colors.primary : "#bbb"};
  background-color: ${(props) => props.theme.colors.translucentShade};
  padding: ${(props) => (props.compact ? "0.5rem 0.6rem" : "0.6rem 0.7rem")};
  cursor: pointer;
  transition: 0.25s;
  font-size: ${(props) => (props.compact ? ".9rem" : "1.2rem")};
  line-height: 0.9;
  border-radius: 100%;

  &:hover {
    color: ${(props) =>
      props.role === "primary" ? props.theme.colors.primary : "#bbb"};
    background-color: var(--mi-icon-button-background-color--hover);
  }
`;

export default IconButton;
