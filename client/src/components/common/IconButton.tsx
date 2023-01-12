import styled from "@emotion/styled";
import { colorShade } from "utils/theme";
import { Compactable } from "./Button";

const IconButton = styled.button<Compactable>`
  border: none;
  color: ${(props) =>
    props.color === "primary"
      ? props.theme.colors.primary
      : props.theme.colors.text};
  background-color: transparent;
  padding: ${(props) => (props.compact ? "0" : "0.4rem 0.5rem")};
  cursor: pointer;
  transition: 0.25s;
  font-size: ${(props) => (props.compact ? "1rem" : "1.4rem")};
  line-height: 0.9;
  border-radius: 2px;

  @media (prefers-color-scheme: dark) {
    color: ${(props) => props.theme.colors.textDark};
  }

  &:hover {
    color: ${(props) =>
      colorShade(
        props.color === "primary"
          ? props.theme.colors.primary
          : props.theme.colors.text,
        80
      )};
  }
`;

export default IconButton;
