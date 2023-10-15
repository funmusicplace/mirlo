import styled from "@emotion/styled";
import colorShade from "utils/colorShade";

export const Table = styled.table`
  width: 100%;
  border: none;
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
    &:nth-of-type(odd) {
      background-color: ${(props) => props.theme.colors.translucentTint};

      @media (prefers-color-scheme: dark) {
        background-color: ${(props) => props.theme.colors.translucentShade};
      }
    }
    &:hover {
      background-color: ${(props) =>
        colorShade(props.theme.colors.background, -40)} !important;

      @media (prefers-color-scheme: dark) {
        background-color: ${(props) =>
          colorShade(props.theme.colors.backgroundDark, -40)} !important;
      }
    }
  }

  & th {
    text-align: left;
    background-color: ${(props) => props.theme.colors.translucentShade};
  }
  & td,
  & th {
    padding: 0.5rem 1rem;
  }
  & td.alignRight,
  & th.alignRight {
    text-align: right;
  }

  @media screen and (max-width: 800px) {
    & td,
    &th {
      padding: 0.25rem 0.5rem;
    }
  }
`;

export default Table;
