import prisma from "@mirlo/prisma";
import { ArtistLabel } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
// @ts-ignore: Ignore import errors for github-slugger
import { slug } from "github-slugger";

import { assertLoggedIn } from "../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../auth/passport";
import { AppError, HttpCode } from "../../../utils/error";

interface TrackArtistData {
  artistName: string;
  role?: string;
}

interface TrackData {
  title: string;
  order: number;
  isrc?: string;
  lyrics?: string;
  profiles: TrackArtistData[];
  metadata?: Record<string, unknown>;
}

interface TrackGroupData {
  title: string;
  releaseDate?: string;
  publishedAt?: string;
  tracks: TrackData[];
  about?: string;
  catalogNumber?: string;
}

interface BulkUploadRequest {
  artists: Array<{
    name: string;
    trackGroups: TrackGroupData[];
  }>;
}

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artists: profiles } = req.body as BulkUploadRequest;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    const loggedInUserId = loggedInUser.id;

    if (!Array.isArray(profiles) || profiles.length === 0) {
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
      for (const profileData of profiles) {
        try {
          if (!profileData.name || typeof profileData.name !== "string") {
            result.partialErrors.push("Artist name is required");
            continue;
          }

          if (
            !Array.isArray(profileData.trackGroups) ||
            profileData.trackGroups.length === 0
          ) {
            result.partialErrors.push(
              `Artist "${profileData.name}": No track groups provided`
            );
            continue;
          }

          const artistName = profileData.name;

          // Find or create the artist
          let profile = await prisma.profile.findFirst({
            where: {
              name: artistName,
              OR: [
                { userId: loggedInUserId },
                { paymentToUserId: loggedInUserId },
              ],
            },
            include: {
              artistLabels: true,
            },
          });

          if (!profile) {
            profile = await prisma.profile.create({
              data: {
                name: artistName,
                urlSlug: slug(artistName),
                userId: loggedInUserId,
              },
              include: {
                artistLabels: true,
              },
            });
            result.artistsCreated++;
          }

          // Process all track groups for this artist
          for (const trackGroup of profileData.trackGroups) {
            try {
              // Generate URL slug for the track group
              const urlSlug = slug(trackGroup.title);

              // Check if URL slug is unique for this artist
              let slugCounter = 0;
              let finalSlug = urlSlug;
              let existingTrackGroup = await prisma.trackGroup.findUnique({
                where: {
                  profileId_urlSlug: {
                    profileId: profile.id,
                    urlSlug: finalSlug,
                  },
                },
              });

              while (existingTrackGroup) {
                slugCounter++;
                finalSlug = `${urlSlug}-${slugCounter}`;
                existingTrackGroup = await prisma.trackGroup.findUnique({
                  where: {
                    profileId_urlSlug: {
                      profileId: profile.id,
                      urlSlug: finalSlug,
                    },
                  },
                });
              }

              // Determine if label should receive payments for this release
              let paymentToUserId: number | undefined = undefined;
              if (
                profile?.artistLabels?.some(
                  (label: ArtistLabel) =>
                    label.labelUserId === loggedInUserId &&
                    label.canLabelAddReleases
                )
              ) {
                paymentToUserId = loggedInUserId;
              }

              // Create the track group
              const createdTrackGroup = await prisma.trackGroup.create({
                data: {
                  title: trackGroup.title,
                  profile: { connect: { id: profile.id } },
                  urlSlug: finalSlug,
                  about: trackGroup.about,
                  releaseDate: trackGroup.releaseDate
                    ? new Date(trackGroup.releaseDate)
                    : undefined,
                  publishedAt: trackGroup.publishedAt
                    ? new Date(trackGroup.publishedAt)
                    : undefined,
                  catalogNumber: trackGroup.catalogNumber,
                  ...(paymentToUserId && {
                    paymentToUser: { connect: { id: paymentToUserId } },
                  }),
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
                  for (const trackArtist of track.profiles) {
                    // Find or create the artist if artistName is provided
                    let contributingProfile = undefined;
                    if (trackArtist.artistName) {
                      contributingProfile = await prisma.profile.findFirst({
                        where: {
                          name: trackArtist.artistName,
                        },
                      });
                    }

                    // Create track artist relationship
                    await prisma.trackArtist.create({
                      data: {
                        trackId: createdTrack.id,
                        artistId: contributingProfile?.id,
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
            `Artist "${profileData.name}": ${
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
                              profiles: {
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
