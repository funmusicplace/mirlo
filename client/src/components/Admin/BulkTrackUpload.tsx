import React, { useState } from "react";
import { css } from "@emotion/css";
import Button, { ButtonAnchor } from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import CSVUploadStep, { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import TrackGroupPreview from "./TrackGroupPreview";

interface PreviewTrackGroup {
  release_title: string;
  release_artist: string;
  tracks: any[];
  metadata: Record<string, string>;
}

const BulkTrackUpload: React.FC = () => {
  const [step, setStep] = useState<
    "upload" | "preview" | "uploading" | "complete"
  >("upload");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleMappingComplete = (
    newMapping: ColumnMapping,
    data: ParsedRow[]
  ) => {
    setMapping(newMapping);
    setCsvData(data);
    // Get headers by re-parsing from the data
    if (data.length > 0) {
      setHeaders(Object.keys(data[0]));
    }
    setStep("preview");
    setError("");
  };

  const handleSubmitTrackGroups = async (trackGroups: PreviewTrackGroup[]) => {
    setStep("uploading");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/admin/bulk-track-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackGroups,
          mapping,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload tracks");
      }

      const result = await response.json();
      setUploadResult(result);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  if (step === "upload") {
    return (
      <div
        className={css`
          max-width: 1200px;
          margin: 0 auto;
        `}
      >
        <h2>Bulk Track Upload</h2>
        <CSVUploadStep onMappingComplete={handleMappingComplete} />
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div
        className={css`
          max-width: 1200px;
          margin: 0 auto;
        `}
      >
        <h2>Bulk Track Upload</h2>
        <TrackGroupPreview
          csvData={csvData}
          mapping={mapping}
          headers={headers}
          onBack={() => setStep("upload")}
          onSubmit={handleSubmitTrackGroups}
        />
      </div>
    );
  }

  if (step === "uploading") {
    return (
      <div
        className={css`
          max-width: 600px;
          margin: 4rem auto;
          text-align: center;
        `}
      >
        <h2>Uploading...</h2>
        <div
          className={css`
            margin: 2rem 0;
            padding: 2rem;
            background: #f5f5f5;
            border-radius: 8px;
          `}
        >
          <LoadingSpinner size="large" />
          <p>Creating artists, albums, and tracks...</p>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div
        className={css`
          max-width: 800px;
          margin: 0 auto;
        `}
      >
        <h2>Upload Complete</h2>
        {error && (
          <div
            className={css`
              padding: 1rem;
              background: #ffebee;
              border: 1px solid #ef5350;
              border-radius: 4px;
              color: #c62828;
              margin-bottom: 1rem;
            `}
          >
            {error}
          </div>
        )}

        {uploadResult && (
          <div
            className={css`
              padding: 2rem;
              background: #e8f5e9;
              border: 1px solid #4caf50;
              border-radius: 8px;
              margin-bottom: 2rem;
            `}
          >
            <h3
              className={css`
                color: #2e7d32;
                margin-top: 0;
              `}
            >
              Success!
            </h3>
            <ul
              className={css`
                color: #2e7d32;
                margin: 1rem 0;

                li {
                  margin: 0.5rem 0;
                }
              `}
            >
              <li>{uploadResult.artistsCreated} artists created</li>
              <li>{uploadResult.trackGroupsCreated} albums created</li>
              <li>{uploadResult.tracksCreated} tracks created</li>
            </ul>

            {uploadResult.partialErrors &&
              uploadResult.partialErrors.length > 0 && (
                <div
                  className={css`
                    margin-top: 1rem;
                    padding: 1rem;
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    border-radius: 4px;
                    color: #856404;
                  `}
                >
                  <strong>Warnings:</strong>
                  <ul
                    className={css`
                      margin: 0.5rem 0 0 0;
                    `}
                  >
                    {uploadResult.partialErrors.map(
                      (err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        )}

        <div
          className={css`
            display: flex;
            gap: 1rem;
          `}
        >
          <Button
            onClick={() => {
              setStep("upload");
              setMapping({});
              setCsvData([]);
              setHeaders([]);
              setUploadResult(null);
              setError("");
            }}
            buttonRole="primary"
          >
            Upload Another File
          </Button>
          <ButtonAnchor href="/admin/trackgroups" variant="outlined">
            View Albums
          </ButtonAnchor>
        </div>
      </div>
    );
  }

  return null;
};

export default BulkTrackUpload;
