import React, { useMemo } from "react";
import { css } from "@emotion/css";
import Button from "../common/Button";
import { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import Table from "components/common/Table";

interface PreviewTrackGroup {
  release_title: string;
  release_artist: string;
  tracks: PreviewTrack[];
  metadata: Record<string, string>;
}

interface PreviewTrack {
  track_title: string;
  track_number: string;
  artists: ArtistRole[];
  isrc?: string;
  lyrics?: string;
  other_fields: Record<string, string>;
}

interface ArtistRole {
  name: string;
  role: string;
}

interface TrackGroupPreviewProps {
  csvData: ParsedRow[];
  mapping: ColumnMapping;
  headers: string[];
  onBack: () => void;
  onSubmit: (trackGroups: PreviewTrackGroup[]) => void;
}

const TrackGroupPreview: React.FC<TrackGroupPreviewProps> = ({
  csvData,
  mapping,
  headers,
  onBack,
  onSubmit,
}) => {
  const trackGroups = useMemo(() => {
    const grouped: Record<string, PreviewTrackGroup> = {};

    csvData.forEach((row) => {
      const releaseTitle = getMappedValue(
        row,
        "release_title",
        mapping,
        headers
      );
      const releaseArtist = getMappedValue(
        row,
        "release_artist",
        mapping,
        headers
      );

      if (!releaseTitle || !releaseArtist) return;

      const key = `${releaseTitle}|${releaseArtist}`;

      if (!grouped[key]) {
        grouped[key] = {
          release_title: releaseTitle,
          release_artist: releaseArtist,
          tracks: [],
          metadata: {},
        };
      }

      const artists: ArtistRole[] = [];
      const artistRoles = [
        "composer",
        "songwriter",
        "publisher",
        "producer",
        "featured_artist",
      ];

      artistRoles.forEach((role) => {
        const artistName = getMappedValue(row, role, mapping, headers);
        if (artistName) {
          artists.push({ name: artistName, role });
        }
      });

      // Handle custom track artist roles (where column header becomes the role)
      headers.forEach((header, index) => {
        const fieldType = mapping[index];
        if (fieldType === "track_artist_role") {
          const artistName = row[header];
          if (artistName) {
            artists.push({ name: artistName, role: header });
          }
        }
      });

      const track: PreviewTrack = {
        track_title:
          getMappedValue(row, "track_title", mapping, headers) || "Untitled",
        track_number:
          getMappedValue(row, "track_number", mapping, headers) || "",
        artists,
        isrc: getMappedValue(row, "isrc", mapping, headers),
        lyrics: getMappedValue(row, "lyrics", mapping, headers),
        other_fields: getUnmappedFields(row, mapping, headers),
      };

      grouped[key].tracks.push(track);
    });

    return Object.values(grouped);
  }, [csvData, mapping, headers]);

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
        with {trackGroups.reduce((sum, tg) => sum + tg.tracks.length, 0)} total
        tracks.
      </p>

      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        `}
      >
        {trackGroups.map((tg, index) => (
          <TrackGroupCard key={index} trackGroup={tg} index={index} />
        ))}
      </div>

      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
        `}
      >
        <Button onClick={onBack} variant="outlined">
          Back
        </Button>
        <Button onClick={() => onSubmit(trackGroups)} buttonRole="primary">
          Create {trackGroups.length} Album{trackGroups.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
};

const TrackGroupCard: React.FC<{
  trackGroup: PreviewTrackGroup;
  index: number;
}> = ({ trackGroup, index }) => {
  const [expanded, setExpanded] = React.useState(true);

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
            {trackGroup.release_title}
          </h4>
          <p
            className={css`
              margin: 0;
              color: #666;
              font-size: 0.9rem;
            `}
          >
            {trackGroup.release_artist} • {trackGroup.tracks.length} track
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
                  <td>{track.track_number || idx + 1}</td>
                  <td>{track.track_title}</td>
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
                            <strong>{artist.name}</strong> ({artist.role})
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

          {trackGroup.metadata &&
            Object.keys(trackGroup.metadata).length > 0 && (
              <div
                className={css`
                  margin-top: 1rem;
                  padding: 1rem;
                  background: #f5f5f5;
                  border-radius: 4px;
                  font-size: 0.85rem;
                `}
              >
                <strong>Additional Metadata:</strong>
                <pre
                  className={css`
                    margin: 0.5rem 0 0 0;
                    white-space: pre-wrap;
                    word-break: break-all;
                    font-size: 0.8rem;
                  `}
                >
                  {JSON.stringify(trackGroup.metadata, null, 2)}
                </pre>
              </div>
            )}
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
