import styled from "@emotion/styled";
import React from "react";

const StyledTable = styled.table`
  width: 100%;
  border: none;
  border-collapse: collapse;

  & tbody tr {
    transition: 0.25s background-color;
  }
`;

export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...rest }, ref) => (
  <StyledTable
    ref={ref}
    className={`mi-table${className ? ` ${className}` : ""}`}
    {...rest}
  />
));

Table.displayName = "Table";

export default Table;
