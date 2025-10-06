import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { doesPostBelongToUser } from "../../../../../utils/post";
import { AppError } from "../../../../../utils/error";
import slugify from "slugify";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
    DELETE: [userAuthenticated, doesPostBelongToUser, DELETE],
    GET: [userAuthenticated, doesPostBelongToUser, GET],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params;
    try {
      const {
        title,
        artistId,
        content,
        isPublic,
        publishedAt,
        minimumSubscriptionTierId,
        shouldSendEmail,
        urlSlug,
      } = req.body;
      const user = req.user as User;

      if (minimumSubscriptionTierId !== undefined) {
        const validTier = await prisma.artistSubscriptionTier.findFirst({
          where: {
            artistId,
            id: minimumSubscriptionTierId,
          },
        });

        if (!validTier) {
          throw new AppError({
            httpCode: 400,
            description:
              "That subscription tier isn't associated with the artist",
          });
        }
      }

      const post = await prisma.post.findUnique({
        where: {
          id: Number(postId),
        },
      });

      const updatedPost = await prisma.post.update({
        data: {
          title,
          artistId,
          content,
          isPublic,
          publishedAt,
          minimumSubscriptionTierId,
          shouldSendEmail,
          urlSlug: !post?.urlSlug
            ? slugify(urlSlug ?? title ?? post?.title, {
                locale: user.language ?? undefined,
                strict: true,
                lower: true,
              })
            : undefined,
        },
        where: {
          id: Number(postId),
        },
      });

      if (content) {
        const postImages = await prisma.postImage.findMany({
          where: {
            postId: updatedPost.id,
          },
        });
        const imagesToDelete = postImages
          .filter((image) => {
            const inContent = content.includes(image.id);
            const isFeatured = updatedPost.featuredImageId === image.id;
            return !(inContent || isFeatured);
          })
          .map((image) => image.id);

        await prisma.postImage.deleteMany({
          where: {
            id: { in: imagesToDelete },
          },
        });

        const postTracks = await prisma.postTrack.findMany({
          where: {
            postId: updatedPost.id,
          },
        });
        const trackOrder: { [key: number]: number } = {};
        const tracksToDelete = postTracks
          .filter((pt) => {
            const inContentIndex = content.indexOf(`track/${pt.trackId}`);
            if (inContentIndex !== -1) {
              trackOrder[inContentIndex] = pt.trackId;
            }
            return inContentIndex === -1;
          })
          .map((image) => image.trackId);

        await Promise.all(
          Object.keys(trackOrder)
            .sort((a, b) => Number(a) - Number(b))
            .map(async (key, index) => {
              const trackId = trackOrder[Number(key)];
              await prisma.postTrack.update({
                where: {
                  trackId_postId: {
                    postId: updatedPost.id,
                    trackId: trackId,
                  },
                },
                data: {
                  order: index + 1,
                },
              });
            })
        );

        await prisma.postTrack.deleteMany({
          where: {
            postId: updatedPost.id,
            trackId: { in: tracksToDelete },
          },
        });
      }

      const refreshedPost = await prisma.post.findFirst({
        where: {
          id: updatedPost.id,
        },
        include: {
          tracks: {
            orderBy: {
              order: "asc",
            },
          },
          images: true,
        },
      });
      res.json({ result: refreshedPost });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params;
    try {
      await prisma.post.delete({
        where: {
          id: Number(postId),
        },
      });
      await prisma.postImage.deleteMany({
        where: {
          postId: Number(postId),
        },
      });
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a Post",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { postId }: { postId?: string } = req.params;

    try {
      const post = await prisma.post.findUnique({
        where: { id: Number(postId) },
        include: {
          tracks: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });
      res.json({ result: post });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns Post information",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A post that matches the id",
        schema: {
          $ref: "#/definitions/Post",
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
