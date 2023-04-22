import { Response } from "express";
import { Parser } from "json2csv";

export const downloadCSVFile = (
  res: Response,
  fileName: string,
  fields: { label: string; value: string }[],
  data: { [key: string]: any }
) => {
  const json2csv = new Parser({ fields });
  const csv = json2csv.parse(data);
  res.header("Content-Type", "text/csv");
  // res.attachment(fileName);
  return res.send(csv);
};
