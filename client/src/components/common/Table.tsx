import styled from "@emotion/styled";
import React from "react";

import ScrollFadeOverlay from "./ScrollFadeOverlay";

const StyledTable = styled.table`
  width: 100%;
  border: 1px solid var(--mi-tint-color);
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
  }
`;

export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...rest }, ref) => {
  const reactId = React.useId();
  const scrollId = `table-scroll-${reactId.replace(/:/g, "")}`;
  return (
    <div className="relative">
      <div id={scrollId} className="max-w-full overflow-x-auto">
        <StyledTable
          ref={ref}
          className={`mi-table${className ? ` ${className}` : ""}`}
          {...rest}
        />
      </div>
      <ScrollFadeOverlay scrollElementId={scrollId} position="left" />
      <ScrollFadeOverlay scrollElementId={scrollId} position="right" />
    </div>
  );
});

Table.displayName = "Table";

export default Table;
