import styled from "@emotion/styled";
import { bp } from "../../constants";

const HeaderDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 0.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    flex-direction: column;
    align-items: flex-start !important;
    margin-bottom: 0.5rem;
  }
`;

export default HeaderDiv;
