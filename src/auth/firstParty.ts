import { Request } from "express";

const FIRST_PARTY_FETCH_SITES = ["same-origin", "same-site"];

export const isFromMirloOrApprovedClient = (req: Request) =>
  req.client?.status === "approved" ||
  FIRST_PARTY_FETCH_SITES.includes(req.get("sec-fetch-site") ?? "");
