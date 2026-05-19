import styled from "@emotion/styled";
import React from "react";

import ScrollFadeOverlay from "./ScrollFadeOverlay";

const StyledTable = styled.table`
  width: 100%;
  border: none;
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
  }
`;

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  isTrackRow?: boolean;
};

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, isTrackRow, ...rest }, ref) => {
    const reactId = React.useId();
    const scrollId = `table-scroll-${reactId.replace(/:/g, "")}`;
    const tableClass = isTrackRow
      ? className
      : `mi-table${className ? ` ${className}` : ""}`;
    return (
      <div className="relative">
        <div id={scrollId} className="max-w-full overflow-x-auto">
          <StyledTable ref={ref} className={tableClass} {...rest} />
        </div>
        <ScrollFadeOverlay scrollElementId={scrollId} position="left" />
        <ScrollFadeOverlay scrollElementId={scrollId} position="right" />
      </div>
    );
  }
);

Table.displayName = "Table";

export default Table;
