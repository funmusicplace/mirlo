import styled from "@emotion/styled";
import { bp } from "../../constants";

export const Table = styled.table`
  width: 100%;
  border: none;
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
  }

  & th {
    text-align: left;
    background-color: var(--mi-darken-background-color);
  }
  & td,
  & th {
    padding: 0.4rem 0.3rem 0.4rem 0.5rem;
    margin: 0rem;
  }
  & td.alignRight,
  & th.alignRight {
    text-align: right;
  }

  @media screen and (max-width: ${bp.medium}px) {
    & td,
    &th {
      padding: 0.25rem 0.5rem;
    }
  }
  @media screen and (max-width: ${bp.small}px) {
    tr {
      max-width: 100%;
      white-space: wrap;
    }

    & th {
      font-size: var(--mi-font-size-small);
      padding: 0 0.1rem;
      margin: 0rem;
    }
  }
`;

export default Table;
