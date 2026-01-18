import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError, HttpCode } from "../../../utils/error";
// @ts-ignore: Ignore import errors for github-slugger
import { slug } from "github-slugger";
import { User } from "@mirlo/prisma/client";

interface PreviewTrack {
  track_title: string;
  track_number: string;
  artists: Array<{
    name: string;
    role: string;
  }>;
  isrc?: string;
  lyrics?: string;
  other_fields: Record<string, string>;
}

interface PreviewTrackGroup {
  release_title: string;
  release_artist: string;
  tracks: PreviewTrack[];
  metadata: Record<string, string>;
}

interface ColumnMapping {
  [columnIndex: number]: string;
}

interface BulkUploadRequest {
  trackGroups: PreviewTrackGroup[];
  mapping: ColumnMapping;
}

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroups } = req.body as BulkUploadRequest;
    const loggedInUser = req.user as User | undefined;

    if (!loggedInUser) {
      return next(
        new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "User not authenticated",
        })
      );
    }

    if (!Array.isArray(trackGroups) || trackGroups.length === 0) {
      return next(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "No track groups provided",
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
      for (const trackGroup of trackGroups) {
        try {
          // Find or create the release artist
          let releaseArtist = await prisma.artist.findFirst({
            where: {
              name: trackGroup.release_artist,
              user: {
                id: loggedInUser.id,
              },
            },
          });

          if (!releaseArtist) {
            releaseArtist = await prisma.artist.create({
              data: {
                name: trackGroup.release_artist,
                urlSlug: slug(trackGroup.release_artist),
                userId: loggedInUser.id,
              },
            });
            result.artistsCreated++;
          }

          // Generate URL slug for the track group
          const urlSlug = slug(trackGroup.release_title);

          // Check if URL slug is unique for this artist
          let slugCounter = 0;
          let finalSlug = urlSlug;
          let existingTrackGroup = await prisma.trackGroup.findUnique({
            where: {
              artistId_urlSlug: {
                artistId: releaseArtist.id,
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
                  artistId: releaseArtist.id,
                  urlSlug: finalSlug,
                },
              },
            });
          }

          // Create the track group
          const createdTrackGroup = await prisma.trackGroup.create({
            data: {
              title: trackGroup.release_title,
              artistId: releaseArtist.id,
              urlSlug: finalSlug,
              // Store metadata in the about field for now
              about: trackGroup.metadata?.catalogNumber || undefined,
              published: false,
            },
          });
          result.trackGroupsCreated++;

          // Process tracks
          for (
            let trackIdx = 0;
            trackIdx < trackGroup.tracks.length;
            trackIdx++
          ) {
            const track = trackGroup.tracks[trackIdx];

            try {
              const createdTrack = await prisma.track.create({
                data: {
                  title: track.track_title,
                  trackGroupId: createdTrackGroup.id,
                  isrc: track.isrc,
                  lyrics: track.lyrics,
                  order: trackIdx,
                  metadata: track.other_fields || {},
                },
              });
              result.tracksCreated++;

              // Create track artists (multiple roles)
              const artistsToCreate = new Set<string>();

              for (const artist of track.artists) {
                const artistKey = `${artist.name}|${artist.role}`;
                if (!artistsToCreate.has(artistKey)) {
                  artistsToCreate.add(artistKey);

                  // Find or create the artist
                  let trackArtist = await prisma.artist.findFirst({
                    where: {
                      name: artist.name,
                    },
                  });

                  if (!trackArtist) {
                    trackArtist = await prisma.artist.create({
                      data: {
                        name: artist.name,
                        urlSlug: slug(artist.name),
                        userId: loggedInUser.id,
                      },
                    });
                    result.artistsCreated++;
                  }

                  // Create track artist relationship
                  await prisma.trackArtist.create({
                    data: {
                      trackId: createdTrack.id,
                      artistId: trackArtist.id,
                      artistName: artist.name,
                      role: artist.role,
                      order: 0,
                    },
                  });
                }
              }
            } catch (trackError) {
              result.partialErrors.push(
                `Track "${track.track_title}" in album "${trackGroup.release_title}": ${
                  trackError instanceof Error
                    ? trackError.message
                    : "Unknown error"
                }`
              );
            }
          }
        } catch (groupError) {
          result.partialErrors.push(
            `Album "${trackGroup.release_title}": ${
              groupError instanceof Error ? groupError.message : "Unknown error"
            }`
          );
        }
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Bulk upload tracks from CSV data",
    description:
      "Creates track groups, tracks, and artists from validated CSV data",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        schema: {
          type: "object",
          properties: {
            trackGroups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  release_title: { type: "string" },
                  release_artist: { type: "string" },
                  tracks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        track_title: { type: "string" },
                        track_number: { type: "string" },
                        artists: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              role: { type: "string" },
                            },
                          },
                        },
                        isrc: { type: "string" },
                        lyrics: { type: "string" },
                        other_fields: { type: "object" },
                      },
                    },
                  },
                  metadata: { type: "object" },
                },
              },
            },
            mapping: { type: "object" },
          },
          required: ["trackGroups"],
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
