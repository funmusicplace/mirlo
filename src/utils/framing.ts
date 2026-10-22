import { NextFunction, Request, Response } from "express";

const EMBEDDABLE_PATH = /^\/widget\//i;

export const denyFramingExceptWidgets = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!EMBEDDABLE_PATH.test(req.path)) {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    res.setHeader("X-Frame-Options", "DENY");
  }
  next();
};
