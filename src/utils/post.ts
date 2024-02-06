import { Artist, ArtistAvatar, Post, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/prisma";
import showdown from "showdown";
import { addSizesToImage } from "./artist";
import { finalArtistAvatarBucket } from "./minio";
import { AppError } from "./error";

export const processSinglePost = (
  post: Post & { artist?: (Artist & { avatar?: ArtistAvatar | null }) | null },
  isUserSubscriber?: boolean
) => ({
  ...post,
  artist: {
    ...post.artist,
    avatar: post.artist
      ? addSizesToImage(finalArtistAvatarBucket, post.artist?.avatar)
      : null,
  },
  isContentHidden: !(isUserSubscriber || post.isPublic),
});

export default {
  single: processSinglePost,
};

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
  const { userId, postId } = req.params;
  const loggedInUser = req.user as User | undefined;
  try {
    if (userId && postId) {
      if (loggedInUser?.id === Number(userId) || loggedInUser?.isAdmin) {
        const post = await prisma.post.findFirst({
          where: {
            artist: {
              userId: Number(userId),
            },
            deletedAt: null,
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
