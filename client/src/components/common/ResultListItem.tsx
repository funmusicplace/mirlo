import styled from "@emotion/styled";
import { bp } from "../../constants";

type Props = {
  fullWidth?: boolean;
};

export const ResultListItem = styled.li<Props>`
  display: inline-flex;
  margin-right: 0.5rem;
  width: ${({ fullWidth }) => (fullWidth ? "100%" : "45%")};
  transition: margin-top 0.25s;
  @media (max-width: ${bp.medium}px) {
    width: 100%;
  }
`;

export default ResultListItem;
