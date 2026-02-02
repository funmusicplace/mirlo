import React, { useState } from "react";
import { css } from "@emotion/css";
import Button, { ButtonAnchor } from "../../common/Button";
import CSVUploadStep, { ColumnMapping, ParsedRow } from "./CSVUploadStep";
import TrackGroupPreview, { PreviewTrackGroup } from "./TrackGroupPreview";
import api from "services/api";
import Box from "components/common/Box";

const BulkTrackUpload: React.FC = () => {
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
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
      <TrackGroupPreview
        csvData={csvData}
        mapping={mapping}
        headers={headers}
        userId={userId}
        onBack={() => setStep("upload")}
        onDone={() => setStep("complete")}
      />
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
