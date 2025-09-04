import styled from "@emotion/styled";
import { ButtonLink } from "./Button";
import { bp } from "../../constants";

const FixedButtonLink = styled(ButtonLink)`
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  background-color: rgba(255, 255, 255, 0.9) !important;
  color: black !important;
  height: auto;
  width: auto;

  justify-content: space-between;

  :hover {
    background-color: rgba(0, 0, 0, 0.7) !important;
    color: white !important;
  }

  @media screen and (min-width: ${bp.medium}px) {
    padding: 0.5rem !important;
  }

  .endIcon {
    font-size: 1.25rem;
  }
`;

export default FixedButtonLink;
