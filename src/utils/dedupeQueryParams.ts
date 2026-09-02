import url from "url";

import { NextFunction, Request, Response } from "express";

export function dedupeQueryParams(paramNames: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = url.parse(req.url, true);
    let changed = false;

    for (const name of paramNames) {
      const value = parsed.query[name];
      if (Array.isArray(value)) {
        parsed.query[name] = value[0];
        changed = true;
      }
    }

    if (changed) {
      req.url = url.format({ pathname: parsed.pathname, query: parsed.query });
    }

    next();
  };
}
