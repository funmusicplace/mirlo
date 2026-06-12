import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { uniq } from "lodash";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";
import generateSlug from "../../../../../utils/generateSlug";
import { doesPostBelongToUser } from "../../../../../utils/post";

async function syncPostImages(
  postId: number,
  content: string,
  featuredImageId: string | null
) {
  const postImages = await prisma.postImage.findMany({
    where: { postId },
  });
  const imagesToDelete = postImages
    .filter((image) => {
      const inContent = content.includes(image.id);
      const isFeatured = featuredImageId === image.id;
      return !(inContent || isFeatured);
    })
    .map((image) => image.id);
  await prisma.postImage.deleteMany({
    where: { id: { in: imagesToDelete } },
  });
}

async function syncPostTracks(postId: number, content: string) {
  // Collect all widget embeds in the order they appear in the content

  const allWidgetMatches = Array.from(
    content.matchAll(/\/widget\/(trackGroup|track)\/(\d+)/g)
  );

  // Pre-fetch tracks for any embedded trackGroups, keyed by trackGroupId
  const trackGroupIds = uniq(
    allWidgetMatches
      .filter((m) => m[1] === "trackGroup")
      .map((m) => Number(m[2]))
  );
  const trackGroupTracksMap = new Map<number, number[]>();
  if (trackGroupIds.length > 0) {
    const trackGroupTracks = await prisma.track.findMany({
      where: { trackGroupId: { in: trackGroupIds }, deletedAt: null },
      orderBy: [{ trackGroupId: "asc" }, { order: "asc" }],
      select: { id: true, trackGroupId: true },
    });
    for (const t of trackGroupTracks) {
      const ids = trackGroupTracksMap.get(t.trackGroupId) ?? [];
      ids.push(t.id);
      trackGroupTracksMap.set(t.trackGroupId, ids);
    }
  }

  // Build ordered list interspersing individual tracks and expanded trackGroups
  const seenTrackIds = new Set<number>();
  const uniqueOrderedTrackIds: number[] = [];
  for (const match of allWidgetMatches) {
    const ids =
      match[1] === "track"
        ? [Number(match[2])]
        : (trackGroupTracksMap.get(Number(match[2])) ?? []);
    for (const id of ids) {
      if (!seenTrackIds.has(id)) {
        seenTrackIds.add(id);
        uniqueOrderedTrackIds.push(id);
      }
    }
  }

  const postTracks = await prisma.postTrack.findMany({ where: { postId } });
  const existingTrackIds = postTracks.map((pt) => pt.trackId);

  // Create PostTrack entries for any tracks newly embedded in content
  const newTrackIds = uniqueOrderedTrackIds.filter(
    (id) => !existingTrackIds.includes(id)
  );
  if (newTrackIds.length > 0) {
    await prisma.postTrack.createMany({
      data: newTrackIds.map((trackId) => ({ postId, trackId, order: 0 })),
      skipDuplicates: true,
    });
  }

  // Update order for all tracks present in content
  await Promise.all(
    uniqueOrderedTrackIds.map(async (trackId, index) => {
      await prisma.postTrack.update({
        where: { trackId_postId: { postId, trackId } },
        data: { order: index + 1 },
      });
    })
  );

  // Delete PostTrack entries whose tracks were removed from content
  const tracksToDelete = existingTrackIds.filter(
    (id) => !uniqueOrderedTrackIds.includes(id)
  );
  await prisma.postTrack.deleteMany({
    where: { postId, trackId: { in: tracksToDelete } },
  });
}

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
      assertLoggedIn(req);

      const post = await prisma.post.findFirst({
        where: {
          id: Number(postId),
        },
      });

      // Treat a missing or blank urlSlug (null, undefined, "" or whitespace)
      // as "no slug provided" and fall back to the post's existing slug, then
      // to one auto-generated from the title. A post should never be left with
      // an empty slug since it needs to be linkable.
      const providedSlug =
        typeof urlSlug === "string" ? urlSlug.trim() : urlSlug;
      const existingSlug = post?.urlSlug?.trim() || null;
      const effectiveSlug =
        providedSlug ||
        existingSlug ||
        generateSlug(title ?? post?.title ?? "");

      const effectiveArtistId = artistId ?? post?.artistId;

      if (effectiveSlug && effectiveArtistId) {
        const conflict = await prisma.post.findFirst({
          where: {
            artistId: effectiveArtistId,
            urlSlug: { equals: effectiveSlug, mode: "insensitive" },
            id: { not: Number(postId) },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new AppError({
            httpCode: 400,
            description:
              "A post with that URL slug already exists for this artist",
          });
        }
      }

      if (post?.artistId && minimumSubscriptionTierId !== undefined) {
        const validTier = await prisma.artistSubscriptionTier.findFirst({
          where: {
            artistId: post.artistId,
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

      const updatedPost = await prisma.post.update({
        data: {
          title,
          content,
          isPublic,
          publishedAt,
          minimumSubscriptionTierId,
          shouldSendEmail,
          urlSlug: effectiveSlug,
        },
        where: {
          id: Number(postId),
        },
      });

      if (content) {
        await syncPostImages(
          updatedPost.id,
          content,
          updatedPost.featuredImageId
        );
        await syncPostTracks(updatedPost.id, content);
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
