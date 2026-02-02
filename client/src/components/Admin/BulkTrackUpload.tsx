import React, { useState } from "react";
import { css } from "@emotion/css";
import Button, { ButtonAnchor } from "../common/Button";
import CSVUploadStep, { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import TrackGroupPreview, { PreviewTrackGroup } from "./TrackGroupPreview";
import api from "services/api";
import Box from "components/common/Box";

const BulkTrackUpload: React.FC = () => {
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | undefined>();

  const handleMappingComplete = (
    newMapping: ColumnMapping,
    data: ParsedRow[],
    targetUserId?: number
  ) => {
    setMapping(newMapping);
    setCsvData(data);
    setUserId(targetUserId);
    // Get headers by re-parsing from the data
    if (data.length > 0) {
      setHeaders(Object.keys(data[0]));
    }
    setStep("preview");
    setError("");
  };

  const handleSubmitTrackGroups = async (
    artists: Array<{ name: string; trackGroups: PreviewTrackGroup[] }>
  ) => {
    setLoading(true);
    setError("");

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
        artists,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
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
        {error && <Box variant="warning">{error}</Box>}
        {uploadResult && (
          <Box variant="info">
            <strong>Uploaded so far:</strong> {uploadResult.artistsCreated || 0}
            artists, {uploadResult.trackGroupsCreated || 0} albums,{" "}
            {uploadResult.tracksCreated || 0} tracks
          </Box>
        )}
        <TrackGroupPreview
          csvData={csvData}
          mapping={mapping}
          headers={headers}
          onBack={() => setStep("upload")}
          onSubmit={handleSubmitTrackGroups}
          onDone={() => setStep("complete")}
        />
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
          <Box variant="success">
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
                <Box variant="warning">
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
                </Box>
              )}
          </Box>
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
