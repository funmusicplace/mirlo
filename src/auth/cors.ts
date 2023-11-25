import { flatten } from "lodash";
import prisma from "../../prisma/prisma";
import cors from "cors";
import { NextFunction, Request, Response } from "express";

export const corsCheck = async (...args: [Request, Response, NextFunction]) => {
  const clients = await prisma.client.findMany();
  const origin = [
    ...flatten(
      clients.map((c) =>
        c.allowedCorsOrigins.map((origin) => {
          if (origin.startsWith("regex:")) {
            return new RegExp(origin.replace("regex:", ""));
          }
          return origin;
        })
      )
    ),
    process.env.API_DOMAIN ?? "http://localhost:3000",
  ];
  if (process.env.NODE_ENV === "development") {
    origin.push("http://localhost:8080"); // Just... for ease of coding
  }
  return cors({
    origin,
    credentials: true,
  })(...args);
};
