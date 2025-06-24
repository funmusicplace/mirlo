import styled from "@emotion/styled";
import { bp } from "../../constants";

const TrackgroupGrid = styled.div<{
  gridNumber: string;
  wrap?: boolean;
}>`
  display: grid;

  grid-template-columns: ${(props) => {
    if (props.gridNumber === "2") {
      return "minmax(0,50%) minmax(0,50%)";
    }
    if (props.gridNumber === "3") {
      return "minmax(0,33%) minmax(0,33%) minmax(0,33%)";
    }
    if (props.gridNumber === "6") {
      return "minmax(0,16%) minmax(0,16%) minmax(0,16%) minmax(0,16%) minmax(0,16%) minmax(0,16%)";
    }
    return "minmax(0,25%) minmax(0,25%) minmax(0,25%) minmax(0,25%)";
  }};
  gap: 0 2%;
  width: 100%;
  white-space: nowrap;
  list-style: none;

  a {
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: ${(props) => (props.wrap ? "wrap" : "nowrap")};
    overflow: hidden;
  }

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: minmax(0, 50%) minmax(0, 50%);
    gap: 0 3%;
    font-size: var(--mi-font-size-xsmall);

    a:last-of-type {
      font-size: var(--mi-font-size-xsmall);
    }
  }

  @media screen and (max-width: ${bp.small}px) {
    margin-bottom: 1rem;
  }
`;

export default TrackgroupGrid;
