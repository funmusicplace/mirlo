import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "../../common/Button";
import { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import ArtistGroup from "./ArtistGroup";
import Box from "components/common/Box";
import api from "services/api";
import { queryUserArtists } from "queries";

export interface PreviewTrackGroup {
  title: string;
  tracks: PreviewTrack[];
  about?: string;
  catalogNumber?: string;
  probablyExists?: boolean;
  probablyExistingArtistId?: number;
  probablyExistingTrackGroupId?: number;
}

interface PreviewTrack {
  title: string;
  order: number;
  artists: ArtistRole[];
  isrc?: string;
  lyrics?: string;
  metadata?: Record<string, unknown>;
}

interface ArtistRole {
  artistName: string;
  role?: string;
}

interface TrackGroupPreviewProps {
  csvData: ParsedRow[];
  mapping: ColumnMapping;
  headers: string[];
  onBack: () => void;
  userId: number | undefined;
  onDone?: () => void;
}

const TrackGroupPreview: React.FC<TrackGroupPreviewProps> = ({
  csvData,
  mapping,
  headers,
  onBack,
  onDone,
  userId,
}) => {
  const [uploadedArtists, setUploadedArtists] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string>("");
  const [uploadResult, setUploadResult] = useState<any>(null);

  const [isUploading, setIsUploading] = useState(false);

  const { data: userArtistsResponse } = useQuery(queryUserArtists({ userId }));

  const managedArtistLookup = useMemo(() => {
    const artistLookup = new Map<
      string,
      {
        artistId: number;
        trackGroupIdsByTitle: Map<string, number>;
      }
    >();

    (userArtistsResponse?.results ?? []).forEach((artist) => {
      const normalizedArtistName = normalizeForComparison(artist.name);
      if (!normalizedArtistName) return;

      const existingArtist = artistLookup.get(normalizedArtistName) ?? {
        artistId: artist.id,
        trackGroupIdsByTitle: new Map<string, number>(),
      };

      (artist.trackGroups ?? []).forEach((trackGroup) => {
        const normalizedTitle = normalizeForComparison(trackGroup?.title);
        if (
          normalizedTitle &&
          typeof trackGroup?.id === "number" &&
          !existingArtist.trackGroupIdsByTitle.has(normalizedTitle)
        ) {
          existingArtist.trackGroupIdsByTitle.set(
            normalizedTitle,
            trackGroup.id
          );
        }
      });

      artistLookup.set(normalizedArtistName, existingArtist);
    });

    return artistLookup;
  }, [userArtistsResponse?.results]);

  const { trackGroups, artistGroups, artistProbablyExistingArtistIds } =
    useMemo(() => {
      const grouped: Record<string, PreviewTrackGroup> = {};

      csvData.forEach((row, rowIndex) => {
        const releaseTitle = getMappedValue(
          row,
          "release_title",
          mapping,
          headers
        );

        if (!releaseTitle) return;

        const key = `${releaseTitle}`;

        if (!grouped[key]) {
          grouped[key] = {
            title: `${releaseTitle}`,
            tracks: [],
            about: getMappedValue(row, "about", mapping, headers),
            catalogNumber: getMappedValue(
              row,
              "catalogNumber",
              mapping,
              headers
            ),
          };
        }

        const artists: ArtistRole[] = [];

        // Collect all columns mapped as track_artist_role
        headers.forEach((header, index) => {
          const fieldType = mapping[index];
          if (fieldType === "track_artist_role") {
            const artistName = row[header];
            if (artistName) {
              // The column header is the role name
              artists.push({ artistName, role: header });
            }
          }
        });

        const track: PreviewTrack = {
          title: `${getMappedValue(row, "track_title", mapping, headers) || "Untitled"}`,
          order: rowIndex,
          artists,
          isrc: getMappedValue(row, "isrc", mapping, headers),
          lyrics: getMappedValue(row, "lyrics", mapping, headers),
          metadata: getUnmappedFields(row, mapping, headers),
        };

        grouped[key].tracks.push(track);
      });

      const allTrackGroups = Object.values(grouped);

      const byArtist: Record<string, PreviewTrackGroup[]> = {};
      const byArtistProbablyExistingArtistIds: Record<
        string,
        number | undefined
      > = {};
      allTrackGroups.forEach((tg) => {
        // Get the release artist from the first track
        if (tg.tracks.length > 0) {
          const artistName = getMappedValue(
            csvData[tg.tracks[0].order],
            "release_artist",
            mapping,
            headers
          );
          if (artistName) {
            const normalizedArtistName = normalizeForComparison(artistName);
            const existingArtist =
              managedArtistLookup.get(normalizedArtistName);
            const existingTrackGroupId =
              existingArtist?.trackGroupIdsByTitle.get(
                normalizeForComparison(tg.title)
              );

            tg.probablyExists = !!existingTrackGroupId;
            tg.probablyExistingArtistId = existingArtist?.artistId;
            tg.probablyExistingTrackGroupId = existingTrackGroupId;

            if (existingArtist) {
              byArtistProbablyExistingArtistIds[artistName] =
                existingArtist.artistId;
            }

            if (!byArtist[artistName]) {
              byArtist[artistName] = [];
            }
            byArtist[artistName].push(tg);
          }
        }
      });

      return {
        trackGroups: allTrackGroups,
        artistGroups: byArtist,
        artistProbablyExistingArtistIds: byArtistProbablyExistingArtistIds,
      };
    }, [csvData, mapping, headers, managedArtistLookup]);

  const handleUploadArtist = async (artistName: string) => {
    const artistTrackGroups = artistGroups[artistName];
    if (!artistTrackGroups) return;
    setError("");

    setIsUploading(true);
    try {
      const response = await api.post<
        any,
        {
          result: {
            artistsCreated: number;
            trackGroupsCreated: number;
            tracksCreated: number;
            partialErrors: string[];
          };
        }
      >("admin/bulkTrackUpload", {
        artists: [
          {
            name: artistName,
            trackGroups: artistTrackGroups,
          },
        ],
        ...(userId && { userId }),
      });

      setUploadResult((prev: any) => ({
        ...prev,
        ...(response.result.artistsCreated && {
          artistsCreated: response.result.artistsCreated,
        }),
        ...(response.result.trackGroupsCreated && {
          trackGroupsCreated: response.result.trackGroupsCreated,
        }),
        ...(response.result.tracksCreated && {
          tracksCreated: response.result.tracksCreated,
        }),
        ...(response.result.partialErrors && {
          partialErrors: response.result.partialErrors,
        }),
      }));
      // Stay on preview to allow uploading more artists
      setUploadedArtists((prev) => new Set(prev).add(artistName));
    } catch (err) {
      console.log("err", err);
      setError(
        err instanceof Error
          ? JSON.stringify(err.message)
          : "Unknown error occurred"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const remainingArtists = Object.keys(artistGroups).filter(
    (artist) => !uploadedArtists.has(artist)
  );
  const totalAlbums = trackGroups.length;
  const uploadedAlbums = trackGroups.filter((tg) => {
    // Find which artist this track group belongs to
    for (const [artist, groups] of Object.entries(artistGroups)) {
      if (groups.includes(tg) && uploadedArtists.has(artist)) {
        return true;
      }
    }
    return false;
  }).length;

  return (
    <div>
      <h2>Bulk Track Upload</h2>
      {error && <Box variant="warning">{error}</Box>}
      {uploadResult && (
        <Box variant="info">
          <strong>Uploaded so far:</strong> {uploadResult.artistsCreated || 0}
          artists, {uploadResult.trackGroupsCreated || 0} albums,{" "}
          {uploadResult.tracksCreated || 0} tracks
        </Box>
      )}
      <div className="rounded-lg bg-gray-100 p-8">
        <h3>Review Album Data</h3>
        <p>
          Found {trackGroups.length} album{trackGroups.length !== 1 ? "s" : ""}{" "}
          from {Object.keys(artistGroups).length} artist
          {Object.keys(artistGroups).length !== 1 ? "s" : ""} with{" "}
          {trackGroups.reduce((sum, tg) => sum + tg.tracks.length, 0)} total
          tracks.
        </p>

        {uploadedArtists.size > 0 && (
          <div className="mt-4 rounded border border-[#4caf50] bg-[#e8f5e9] p-4 text-[#2e7d32]">
            <strong>Progress:</strong> {uploadedAlbums}/{totalAlbums} albums
            uploaded from {uploadedArtists.size}/
            {Object.keys(artistGroups).length} artists
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8">
          {Object.entries(artistGroups).map(([artistName, albums]) => {
            const isUploaded = uploadedArtists.has(artistName);
            return (
              <ArtistGroup
                key={artistName}
                artistName={artistName}
                albums={albums}
                probablyExists={Boolean(
                  artistProbablyExistingArtistIds[artistName]
                )}
                probablyExistingArtistId={
                  artistProbablyExistingArtistIds[artistName]
                }
                isUploaded={isUploaded}
                isUploading={isUploading}
                onUpload={() => handleUploadArtist(artistName)}
              />
            );
          })}
        </div>

        <div className="mt-8 flex gap-4">
          <Button
            onClick={onBack}
            variant="outlined"
            disabled={isUploading || uploadedArtists.size > 0}
          >
            Back
          </Button>
          {remainingArtists.length === 0 && uploadedArtists.size > 0 && (
            <>
              <div className="rounded border border-[#4caf50] bg-[#e8f5e9] p-4 font-bold text-[#2e7d32]">
                ✓ All artists uploaded successfully!
              </div>
              {onDone && (
                <Button onClick={onDone} buttonRole="primary">
                  Done
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function normalizeForComparison(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function getMappedValue(
  row: ParsedRow,
  fieldName: string,
  mapping: ColumnMapping,
  headers: string[]
): string {
  const columnIndex = Object.entries(mapping).find(
    ([_, v]) => v === fieldName
  )?.[0];
  if (columnIndex === undefined) return "";
  const header = headers[parseInt(columnIndex)];
  return row[header] || "";
}

function getUnmappedFields(
  row: ParsedRow,
  mapping: ColumnMapping,
  headers: string[]
): Record<string, string> {
  const mappedColumns = new Set(
    Object.keys(mapping).map((i) => headers[parseInt(i)])
  );
  const unmapped: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    if (!mappedColumns.has(key) && value) {
      unmapped[key] = value;
    }
  });

  return unmapped;
}

export default TrackGroupPreview;
