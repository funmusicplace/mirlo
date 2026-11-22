import { Request } from "express";

export const isEmbeddedOnAnotherSite = (req: Request) =>
  req.get("sec-fetch-site") === "cross-site" &&
  req.client?.status !== "approved";
