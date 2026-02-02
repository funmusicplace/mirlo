import React, { useState } from "react";
import Table from "components/common/Table";
import { PreviewTrackGroup } from "./TrackGroupPreview";
import { Link } from "react-router-dom";

const TrackGroupCard: React.FC<{
  trackGroup: PreviewTrackGroup;
  index: number;
}> = ({ trackGroup, index }) => {
  const [expanded, setExpanded] = useState(true);

  const existingAlbumUrl =
    trackGroup.probablyExistingArtistId &&
    trackGroup.probablyExistingTrackGroupId
      ? `/manage/artists/${trackGroup.probablyExistingArtistId}/release/${trackGroup.probablyExistingTrackGroupId}`
      : undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-[#ddd] bg-white">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between border-b border-[#ddd] bg-[#f9f9f9] p-6 hover:bg-[#f0f0f0]"
      >
        <div>
          <h4 className="mb-2 mt-0 text-[1.1rem]">{trackGroup.title}</h4>
          <p className="m-0 text-[0.9rem] text-[#666]">
            {trackGroup.tracks.length} track
            {trackGroup.tracks.length !== 1 ? "s" : ""}
          </p>
          {trackGroup.probablyExists && (
            <p className="mb-0 mt-2 text-[0.8rem] font-semibold text-[#b26a00]">
              Album probably already exists for this artist.
              {existingAlbumUrl && (
                <>
                  {" "}
                  <Link
                    to={existingAlbumUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline"
                  >
                    Open album page
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        <span className="text-2xl text-[#999]">{expanded ? "−" : "+"}</span>
      </div>

      {expanded && (
        <div className="p-6">
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
                      <ul className="m-0 pl-5 text-[0.85rem]">
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

export default TrackGroupCard;
