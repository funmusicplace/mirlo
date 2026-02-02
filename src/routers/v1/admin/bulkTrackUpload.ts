import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError, HttpCode } from "../../../utils/error";
// @ts-ignore: Ignore import errors for github-slugger
import { slug } from "github-slugger";
import { User } from "@mirlo/prisma/client";

interface TrackArtistData {
  artistName: string;
  role?: string;
}

interface TrackData {
  title: string;
  order: number;
  isrc?: string;
  lyrics?: string;
  artists: TrackArtistData[];
  metadata?: Record<string, unknown>;
}

interface TrackGroupData {
  title: string;
  tracks: TrackData[];
  about?: string;
  catalogNumber?: string;
}

interface BulkUploadRequest {
  artists: Array<{
    name: string;
    trackGroups: TrackGroupData[];
  }>;
  userId?: number;
}

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artists, userId } = req.body as BulkUploadRequest;
    const loggedInUser = req.user as User;

    const targetUserId = userId || loggedInUser.id;

    // Verify that the target user exists
    if (userId && userId !== loggedInUser.id) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return next(
          new AppError({
            httpCode: HttpCode.BAD_REQUEST,
            description: `User with ID ${userId} not found`,
          })
        );
      }
    }

    if (!Array.isArray(artists) || artists.length === 0) {
      return next(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "At least one artist is required",
        })
      );
    }

    const result = {
      artistsCreated: 0,
      trackGroupsCreated: 0,
      tracksCreated: 0,
      partialErrors: [] as string[],
    };

    try {
      // Process each artist
      for (const artistData of artists) {
        try {
          if (!artistData.name || typeof artistData.name !== "string") {
            result.partialErrors.push("Artist name is required");
            continue;
          }

          if (
            !Array.isArray(artistData.trackGroups) ||
            artistData.trackGroups.length === 0
          ) {
            result.partialErrors.push(
              `Artist "${artistData.name}": No track groups provided`
            );
            continue;
          }

          const artistName = artistData.name;

          // Find or create the artist
          let artist = await prisma.artist.findFirst({
            where: {
              name: artistName,
              user: {
                id: targetUserId,
              },
            },
          });

          if (!artist) {
            artist = await prisma.artist.create({
              data: {
                name: artistName,
                urlSlug: slug(artistName),
                userId: targetUserId,
              },
            });
            result.artistsCreated++;
          }

          // Process all track groups for this artist
          for (const trackGroup of artistData.trackGroups) {
            try {
              // Generate URL slug for the track group
              const urlSlug = slug(trackGroup.title);

              // Check if URL slug is unique for this artist
              let slugCounter = 0;
              let finalSlug = urlSlug;
              let existingTrackGroup = await prisma.trackGroup.findUnique({
                where: {
                  artistId_urlSlug: {
                    artistId: artist.id,
                    urlSlug: finalSlug,
                  },
                },
              });

              while (existingTrackGroup) {
                slugCounter++;
                finalSlug = `${urlSlug}-${slugCounter}`;
                existingTrackGroup = await prisma.trackGroup.findUnique({
                  where: {
                    artistId_urlSlug: {
                      artistId: artist.id,
                      urlSlug: finalSlug,
                    },
                  },
                });
              }

              // Create the track group
              const createdTrackGroup = await prisma.trackGroup.create({
                data: {
                  title: trackGroup.title,
                  artistId: artist.id,
                  urlSlug: finalSlug,
                  about: trackGroup.about,
                  catalogNumber: trackGroup.catalogNumber,
                  published: false,
                },
              });
              result.trackGroupsCreated++;

              // Process tracks
              for (const track of trackGroup.tracks) {
                try {
                  const createdTrack = await prisma.track.create({
                    data: {
                      title: track.title,
                      trackGroupId: createdTrackGroup.id,
                      isrc: track.isrc,
                      lyrics: track.lyrics,
                      order: track.order,
                      metadata: track.metadata || {},
                    },
                  });
                  result.tracksCreated++;

                  // Create track artists
                  for (const trackArtist of track.artists) {
                    // Find or create the artist if artistName is provided
                    let contributingArtist = undefined;
                    if (trackArtist.artistName) {
                      contributingArtist = await prisma.artist.findFirst({
                        where: {
                          name: trackArtist.artistName,
                        },
                      });
                    }

                    // Create track artist relationship
                    await prisma.trackArtist.create({
                      data: {
                        trackId: createdTrack.id,
                        artistId: contributingArtist?.id,
                        artistName: trackArtist.artistName,
                        role: trackArtist.role,
                        order: 0,
                      },
                    });
                  }
                } catch (trackError) {
                  result.partialErrors.push(
                    `Track "${track.title}" in album "${trackGroup.title}": ${
                      trackError instanceof Error
                        ? trackError.message
                        : "Unknown error"
                    }`
                  );
                }
              }
            } catch (groupError) {
              result.partialErrors.push(
                `Album "${trackGroup.title}": ${
                  groupError instanceof Error
                    ? groupError.message
                    : "Unknown error"
                }`
              );
            }
          }
        } catch (artistError) {
          result.partialErrors.push(
            `Artist "${artistData.name}": ${
              artistError instanceof Error
                ? artistError.message
                : "Unknown error"
            }`
          );
        }
      }

      res.json({ result });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Bulk upload tracks for one or more artists",
    description:
      "Creates track groups and tracks for one or more artists in a single request. All mapping should be done on the frontend before sending to this endpoint.",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        schema: {
          type: "object",
          properties: {
            artists: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the artist to create or use",
                  },
                  trackGroups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        tracks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              order: { type: "number" },
                              artists: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    artistName: { type: "string" },
                                    role: { type: "string" },
                                  },
                                },
                              },
                              isrc: { type: "string" },
                              lyrics: { type: "string" },
                              metadata: { type: "object" },
                            },
                            required: ["title", "order"],
                          },
                        },
                        about: { type: "string" },
                        catalogNumber: { type: "string" },
                      },
                      required: ["title", "tracks"],
                    },
                  },
                },
                required: ["name", "trackGroups"],
              },
            },
            userId: {
              type: "number",
              description:
                "ID of the user to create the artists under (admin only). Defaults to current user.",
            },
          },
          required: ["artists"],
        },
      },
    ],
    responses: {
      200: {
        description: "Bulk upload result",
        schema: {
          type: "object",
          properties: {
            artistsCreated: { type: "number" },
            trackGroupsCreated: { type: "number" },
            tracksCreated: { type: "number" },
            partialErrors: { type: "array", items: { type: "string" } },
          },
        },
      },
      400: {
        description: "Bad request",
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden - admin permission required",
      },
    },
  };

  return operations;
}
