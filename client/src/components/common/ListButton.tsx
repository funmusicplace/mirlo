import styled from "@emotion/styled";
import { NavLink } from "react-router-dom";
import { Compactable } from "./Button";

export const ListButton = styled.button<Compactable>`
  width: 100%;
  height: 100%;
  border: 0;
  margin: 0;
  padding: ${(props) => (props.compact ? "0" : "0.4rem 0.5rem")};
  text-align: inherit;
  font-size: inherit;
  background-color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: ${(props) => props.theme.colors.text};
  transition: 0.5s background-color;

  &:hover {
    background-color: #cfcfcf;
  }

  &:active {
    background-color: ${(props) => props.theme.colors.primary};
  }

  &.active {
    background-color: ${(props) => props.theme.colors.primary};
    color: white;
  }

  svg {
    margin-right: 0.5rem;
  }
`;

export const NavLinkAsButton = ListButton.withComponent(NavLink);

export default ListButton;
