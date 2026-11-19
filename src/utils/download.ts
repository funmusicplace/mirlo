import { Response } from "express";
import { Parser } from "json2csv";
import { get } from "lodash";

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export const neutralizeFormula = (value: unknown) =>
  typeof value === "string" &&
  FORMULA_START.test(value) &&
  !PLAIN_NUMBER.test(value)
    ? `'${value}`
    : value;

export const downloadCSVFile = (
  res: Response,
  fileName: string,
  fields: { label: string; value: string | ((row: any) => any) }[],
  data: { [key: string]: any }
) => {
  const json2csv = new Parser({
    fields: fields.map(({ label, value }) => ({
      label,
      value: (row: any) =>
        neutralizeFormula(
          typeof value === "function" ? value(row) : get(row, value)
        ),
    })),
  });
  const csv = json2csv.parse(data);
  res.header("Content-Type", "text/csv");
  res.attachment(fileName);
  return res.send(csv);
};
