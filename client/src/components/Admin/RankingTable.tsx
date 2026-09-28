import Button from "components/common/Button";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";

export const COLLAPSED_ROWS = 15;

export type RankingColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  numeric?: boolean;
};

function RankingTable<T>({
  title,
  emptyMessage,
  rows,
  getKey,
  columns,
}: {
  title: string;
  emptyMessage: string;
  rows: T[];
  getKey: (row: T) => React.Key;
  columns: RankingColumn<T>[];
}) {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [expanded, setExpanded] = React.useState(false);

  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const canExpand = rows.length > COLLAPSED_ROWS;

  return (
    <div className="p-4 rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color)">
      <h4 className="mb-4 font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>#</th>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className={column.numeric ? "text-right" : undefined}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={getKey(row)}>
                  <td>{index + 1}</td>
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={column.numeric ? "text-right" : undefined}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
          {canExpand && (
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? t("showTopRows", { count: COLLAPSED_ROWS })
                : t("showAllRows", { count: rows.length })}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default RankingTable;
