import React, { useMemo, useState } from "react";
import { css } from "@emotion/css";
import Button from "../common/Button";
import { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import Table from "components/common/Table";

export interface PreviewTrackGroup {
  title: string;
  tracks: PreviewTrack[];
  about?: string;
  catalogNumber?: string;
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
  onSubmit: (
    artists: Array<{ name: string; trackGroups: PreviewTrackGroup[] }>
  ) => Promise<void>;
  onDone?: () => void;
}

const TrackGroupPreview: React.FC<TrackGroupPreviewProps> = ({
  csvData,
  mapping,
  headers,
  onBack,
  onSubmit,
  onDone,
}) => {
  const [uploadedArtists, setUploadedArtists] = useState<Set<string>>(
    new Set()
  );
  const [isUploading, setIsUploading] = useState(false);

  const { trackGroups, artistGroups } = useMemo(() => {
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
          title: releaseTitle,
          tracks: [],
          about: getMappedValue(row, "about", mapping, headers),
          catalogNumber: getMappedValue(row, "catalogNumber", mapping, headers),
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
        title:
          getMappedValue(row, "track_title", mapping, headers) || "Untitled",
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
    };
  }, [csvData, mapping, headers]);

  const handleUploadArtist = async (artistName: string) => {
    const artistTrackGroups = artistGroups[artistName];
    if (!artistTrackGroups) return;

    setIsUploading(true);
    try {
      await onSubmit([
        {
          name: artistName,
          trackGroups: artistTrackGroups,
        },
      ]);
      setUploadedArtists((prev) => new Set(prev).add(artistName));
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
    <div
      className={css`
        padding: 2rem;
        background: #f5f5f5;
        border-radius: 8px;
      `}
    >
      <h3>Review Album Data</h3>
      <p>
        Found {trackGroups.length} album{trackGroups.length !== 1 ? "s" : ""}{" "}
        from {Object.keys(artistGroups).length} artist
        {Object.keys(artistGroups).length !== 1 ? "s" : ""} with{" "}
        {trackGroups.reduce((sum, tg) => sum + tg.tracks.length, 0)} total
        tracks.
      </p>

      {uploadedArtists.size > 0 && (
        <div
          className={css`
            margin-top: 1rem;
            padding: 1rem;
            background: #e8f5e9;
            border: 1px solid #4caf50;
            border-radius: 4px;
            color: #2e7d32;
          `}
        >
          <strong>Progress:</strong> {uploadedAlbums}/{totalAlbums} albums
          uploaded from {uploadedArtists.size}/
          {Object.keys(artistGroups).length} artists
        </div>
      )}

      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        `}
      >
        {Object.entries(artistGroups).map(([artistName, albums]) => {
          const isUploaded = uploadedArtists.has(artistName);
          return (
            <ArtistGroup
              key={artistName}
              artistName={artistName}
              albums={albums}
              isUploaded={isUploaded}
              isUploading={isUploading}
              onUpload={() => handleUploadArtist(artistName)}
            />
          );
        })}
      </div>

      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
        `}
      >
        <Button
          onClick={onBack}
          variant="outlined"
          disabled={isUploading || uploadedArtists.size > 0}
        >
          Back
        </Button>
        {remainingArtists.length === 0 && uploadedArtists.size > 0 && (
          <>
            <div
              className={css`
                padding: 1rem;
                background: #e8f5e9;
                border: 1px solid #4caf50;
                border-radius: 4px;
                color: #2e7d32;
                font-weight: bold;
              `}
            >
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
  );
};

const ArtistGroup: React.FC<{
  artistName: string;
  albums: PreviewTrackGroup[];
  isUploaded: boolean;
  isUploading: boolean;
  onUpload: () => Promise<void>;
}> = ({ artistName, albums, isUploaded, isUploading, onUpload }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={css`
        background: white;
        border-radius: 8px;
        border: 2px solid ${isUploaded ? "#4caf50" : "#ddd"};
        overflow: hidden;
      `}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={css`
          padding: 1.5rem;
          background: ${isUploaded ? "#e8f5e9" : "#f9f9f9"};
          border-bottom: 1px solid ${isUploaded ? "#4caf50" : "#ddd"};
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;

          &:hover {
            background: ${isUploaded ? "#e0f2f1" : "#f0f0f0"};
          }
        `}
      >
        <div
          className={css`
            flex: 1;
          `}
        >
          <div
            className={css`
              display: flex;
              align-items: center;
              gap: 1rem;
            `}
          >
            {isUploaded && (
              <span
                className={css`
                  font-size: 1.5rem;
                  color: #4caf50;
                `}
              >
                ✓
              </span>
            )}
            <div>
              <h4
                className={css`
                  margin: 0 0 0.5rem 0;
                  font-size: 1.1rem;
                `}
              >
                {artistName}
              </h4>
              <p
                className={css`
                  margin: 0;
                  color: #666;
                  font-size: 0.9rem;
                `}
              >
                {albums.length} album{albums.length !== 1 ? "s" : ""} •{" "}
                {albums.reduce((sum, tg) => sum + tg.tracks.length, 0)} total
                tracks
              </p>
            </div>
          </div>
        </div>
        <div
          className={css`
            display: flex;
            gap: 1rem;
            align-items: center;
          `}
        >
          {!isUploaded && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onUpload();
              }}
              buttonRole="primary"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Artist"}
            </Button>
          )}
          <span
            className={css`
              font-size: 1.5rem;
              color: #999;
            `}
          >
            {expanded ? "−" : "+"}
          </span>
        </div>
      </div>

      {expanded && (
        <div
          className={css`
            padding: 1.5rem;
          `}
        >
          {albums.map((tg, index) => (
            <TrackGroupCard key={index} trackGroup={tg} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

const TrackGroupCard: React.FC<{
  trackGroup: PreviewTrackGroup;
  index: number;
}> = ({ trackGroup, index }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={css`
        background: white;
        border-radius: 8px;
        border: 1px solid #ddd;
        overflow: hidden;
      `}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={css`
          padding: 1.5rem;
          background: #f9f9f9;
          border-bottom: 1px solid #ddd;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;

          &:hover {
            background: #f0f0f0;
          }
        `}
      >
        <div>
          <h4
            className={css`
              margin: 0 0 0.5rem 0;
              font-size: 1.1rem;
            `}
          >
            {trackGroup.title}
          </h4>
          <p
            className={css`
              margin: 0;
              color: #666;
              font-size: 0.9rem;
            `}
          >
            {trackGroup.tracks.length} track
            {trackGroup.tracks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span
          className={css`
            font-size: 1.5rem;
            color: #999;
          `}
        >
          {expanded ? "−" : "+"}
        </span>
      </div>

      {expanded && (
        <div
          className={css`
            padding: 1.5rem;
          `}
        >
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Track Title</th>
                <th>Artists</th>
                <th>ISRC</th>
              </tr>
            </thead>
            <tbody>
              {trackGroup.tracks.map((track, idx) => (
                <tr key={idx}>
                  <td>{track.order + 1}</td>
                  <td>{track.title}</td>
                  <td>
                    {track.artists.length > 0 ? (
                      <ul
                        className={css`
                          margin: 0;
                          padding-left: 1.25rem;
                          font-size: 0.85rem;
                        `}
                      >
                        {track.artists.map((artist, aidx) => (
                          <li key={aidx}>
                            <strong>{artist.artistName}</strong>{" "}
                            {artist.role && `(${artist.role})`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{track.isrc || "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

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
