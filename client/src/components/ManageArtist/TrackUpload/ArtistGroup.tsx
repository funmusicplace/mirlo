import React, { useState } from "react";
import { Link } from "react-router-dom";

import Button from "../../common/Button";

import TrackGroupCard from "./TrackGroupCard";
import { PreviewTrackGroup } from "./TrackGroupPreview";

const ArtistGroup: React.FC<{
  artistName: string;
  albums: PreviewTrackGroup[];
  probablyExists: boolean;
  probablyExistingArtistId?: number;
  isUploaded: boolean;
  isUploading: boolean;
  onUpload: () => Promise<void>;
}> = ({
  artistName,
  albums,
  probablyExists,
  probablyExistingArtistId,
  isUploaded,
  isUploading,
  onUpload,
}) => {
  const [expanded, setExpanded] = useState(!probablyExists);

  return (
    <div
      className={`overflow-hidden rounded-lg border-2 bg-(--mi-background-color) ${
        isUploaded ? "border-[#4caf50]" : "border-(--mi-tint-x-color)"
      }`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex cursor-pointer items-center justify-between border-b p-6 ${
          isUploaded
            ? "border-[#4caf50] bg-[#e8f5e9] hover:bg-[#e0f2f1]"
            : "border-(--mi-tint-x-color) bg-(--mi-tint-color) hover:bg-(--mi-alternate-background-color)"
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {isUploaded && <span className="text-2xl text-[#4caf50]">✓</span>}
            <div>
              <h4 className="mb-2 mt-0 text-[1.1rem]">Artist: {artistName}</h4>
              <p className="m-0 text-[0.9rem] opacity-60">
                {albums.length} album{albums.length !== 1 ? "s" : ""} •{" "}
                {albums.reduce((sum, tg) => sum + tg.tracks.length, 0)} total
                tracks
              </p>
              {probablyExists && (
                <p className="mb-0 mt-2 text-[0.8rem] font-semibold text-[#b26a00]">
                  Artist probably already exists for this user.
                  {probablyExistingArtistId && (
                    <Link
                      to={`/manage/artists/${probablyExistingArtistId}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="underline"
                    >
                      Open artist page
                    </Link>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
          <span className="text-2xl opacity-40">{expanded ? "−" : "+"}</span>
        </div>
      </div>

      {expanded && (
        <div className="p-6">
          {albums.map((tg, index) => (
            <TrackGroupCard key={index} trackGroup={tg} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistGroup;
