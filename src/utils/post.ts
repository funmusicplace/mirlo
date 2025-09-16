import { Artist, ArtistAvatar, Post, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import showdown from "showdown";
import { addSizesToImage } from "./artist";
import { finalArtistAvatarBucket, finalPostImageBucket } from "./minio";
import { AppError } from "./error";
import { generateFullStaticImageUrl } from "./images";

export const processSinglePost = (
  post: Partial<Post> & {
    artist?: (Partial<Artist> & { avatar?: ArtistAvatar | null }) | null;
  } & { featuredImage?: { extension: string; id: string } | null },
  isUserSubscriber?: boolean
) => ({
  ...post,
  artist: {
    ...post.artist,
    avatar: post.artist
      ? addSizesToImage(finalArtistAvatarBucket, post.artist?.avatar)
      : null,
  },
  featuredImage: post.featuredImage && {
    ...post.featuredImage,
    src: generateFullStaticImageUrl(
      post.featuredImage.id,
      finalPostImageBucket,
      post.featuredImage.extension
    ),
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
  const { postId } = req.params;
  const loggedInUser = req.user as User | undefined;
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
