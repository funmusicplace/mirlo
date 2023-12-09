import styled from "@emotion/styled";
import { colorShade } from "utils/theme";

export const Table = styled.table`
  width: 100%;
  border: none;
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
    &:hover {
      background-color: ${(props) =>
        colorShade(props.theme.colors.background, -40)} !important;

      @media (prefers-color-scheme: dark) {
        background-color: ${(props) =>
          colorShade(props.theme.colors.background, -40)} !important;
      }
    }
  }

  & th {
    text-align: left;
    background-color: var(--mi-darken-background-color);
  }
  & td,
  & th {
    padding: 0.1rem 0.3rem 0.1rem 1rem;
    margin: 0rem;
  }
  & td.alignRight,
  & th.alignRight {
    text-align: right;
  }

  @media screen and (max-width: 768px) {
    & td,
    &th {
      padding: 0.25rem 0.5rem;
    }
  }
`;

export default Table;
