import { NextFunction, Request, Response } from "express";
import { pickBy } from "lodash";
import qs from "qs";

const isText = (value: unknown) =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((v) => typeof v === "string"));

const isPlainValue = (value: unknown) =>
  value === null || ["string", "number", "boolean"].includes(typeof value);

export const parseTextQuery = (str: string) => pickBy(qs.parse(str), isText);

export const plainBodyValuesOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === "object") {
    req.body = pickBy(req.body, isPlainValue);
  }
  next();
};
