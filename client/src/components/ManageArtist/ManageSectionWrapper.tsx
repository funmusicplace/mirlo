import styled from "@emotion/styled";
import { bp } from "../../constants";

export const ManageSectionWrapper = styled.div`
  padding: 0.5rem 0 2rem 0;
  width: 100%;
  padding-bottom: 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    padding-top: 0rem;
    padding-bottom: 1rem;
  }

  h3 {
    margin-top: 0.5rem;
    margin-bottom: 0.75rem;
  }
`;

export default ManageSectionWrapper;
