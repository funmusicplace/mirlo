import styled from "@emotion/styled";
import Button, { ButtonLink } from "./Button";
import { bp } from "../../constants";

export const FixedButton = styled(Button)`
  box-shadow: 1px 1px 0.15rem rgba(0, 0, 0, 0.15);
  background-color: var(--mi-fixed-bg-color) !important;
  color: var(--mi-fixed-fg-color) !important;
  border: 1px solid
    color-mix(in srgb, var(--mi-fixed-fg-color) 40%, transparent) !important;
  height: auto;
  width: auto;

  justify-content: space-between;

  svg {
    fill: var(--mi-fixed-fg-color);
  }

  :hover {
    background-color: var(--mi-fixed-fg-color) !important;
    color: var(--mi-fixed-bg-color) !important;

    svg {
      fill: var(--mi-fixed-bg-color) !important;
    }
  }

  @media screen and (min-width: ${bp.medium}px) {
    padding: 0.5rem !important;
  }

  .endIcon {
    font-size: 1.25rem;
  }
`;

const FixedButtonLink = styled(ButtonLink)`
  box-shadow: 1px 1px 0.15rem rgba(0, 0, 0, 0.15);
  background-color: var(--mi-fixed-bg-color) !important;
  color: var(--mi-fixed-fg-color) !important;
  border: 1px solid
    color-mix(in srgb, var(--mi-fixed-fg-color) 40%, transparent) !important;
  height: auto;
  width: auto;

  justify-content: space-between;

  :hover {
    background-color: var(--mi-fixed-fg-color) !important;
    color: var(--mi-fixed-bg-color) !important;
  }

  @media screen and (min-width: ${bp.medium}px) {
    padding: 0.5rem !important;
  }

  .endIcon {
    font-size: 1.25rem;
  }
`;

export default FixedButtonLink;
