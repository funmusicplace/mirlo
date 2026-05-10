import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import showdown from "showdown";

import { AppError } from "./error";

const converter = new showdown.Converter({ headerLevelStart: 2 });

export const markdownAsHtml = (content?: string | null) => {
  const text = content ?? "";
  const html = converter.makeHtml(text);
  return html;
};

export const doesPostBelongToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { postId } = req.params;
  const loggedInUser = req.user;
  try {
    if (postId && loggedInUser) {
      if (loggedInUser.isAdmin) {
        const post = await prisma.post.findFirst({
          where: {
            id: Number(postId),
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });
        if (post) {
          return next();
        }
      }

      const post = await prisma.post.findFirst({
        where: {
          id: Number(postId),
          artist: {
            userId: Number(loggedInUser.id),
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (post) {
        return next();
      } else {
        const e = new AppError({
          httpCode: 401,
          description: "Post must belong to user",
        });
        next(e);
      }
    } else {
      const e = new AppError({
        httpCode: 400,
        description: "Invalid request",
      });
      next(e);
    }
  } catch (e) {
    next(e);
  }
};
