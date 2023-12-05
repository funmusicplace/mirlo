import styled from "@emotion/styled";
import { bp } from "../../constants";

const HeaderDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 0.2rem;
  margin-bottom: 0.5rem;
  h2 {
    margin-bottom: 0;
  }
  button {
    height: 2rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    align-items: flex-start !important;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
    padding-bottom: 0rem;
  }
`;

export default HeaderDiv;
