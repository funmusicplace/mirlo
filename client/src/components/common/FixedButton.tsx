import styled from "@emotion/styled";
import Button, { ButtonLink } from "./Button";
import { bp } from "../../constants";

const FixedButtonLink = styled(ButtonLink)`
  box-shadow: 0.2rem 0.2rem 0.3rem rgba(0, 0, 0, 0.5);
  background-color: rgba(255, 255, 255, 0.9) !important;
  color: black !important;

  :hover {
    background-color: rgba(0, 0, 0, 0.7) !important;
    color: white !important;
  }

  @media screen and (min-width: ${bp.medium}px) {
    padding: 1.2rem !important;
  }
`;

export default FixedButtonLink;
