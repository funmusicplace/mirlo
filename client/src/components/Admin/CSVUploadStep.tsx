import React, { useState } from "react";
import { css } from "@emotion/css";
import Button from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";

interface CSVUploadProps {
  onMappingComplete: (mapping: ColumnMapping, data: ParsedRow[]) => void;
}

export interface ColumnMapping {
  [columnIndex: number]: string;
}

export interface ParsedRow {
  [key: string]: string;
}

const FIELD_OPTIONS = [
  { value: "", label: "Skip this column" },
  { value: "release_title", label: "Release Title" },
  { value: "release_artist", label: "Release Display Artist" },
  { value: "track_title", label: "Track Title" },
  { value: "track_number", label: "Track Number" },
  { value: "composer", label: "Composer" },
  { value: "songwriter", label: "Songwriter" },
  { value: "publisher", label: "Publisher" },
  { value: "producer", label: "Producer" },
  { value: "featured_artist", label: "Featured Artist" },
  { value: "track_artist_role", label: "Track Artist Role (custom)" },
  { value: "isrc", label: "ISRC Code" },
  { value: "genre", label: "Genre" },
  { value: "description", label: "Description" },
  { value: "lyrics", label: "Lyrics" },
  { value: "release_date", label: "Release Date" },
  { value: "min_price", label: "Minimum Price (cents)" },
];

const CSVUploadStep: React.FC<CSVUploadProps> = ({ onMappingComplete }) => {
  const [csvData, setCSVData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<"upload" | "mapping" | "review">("upload");
  const [error, setError] = useState<string>("");

  const parseCSV = (text: string): { headers: string[]; data: ParsedRow[] } => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(",").map((h) => h.trim());
    const data: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      if (Object.values(row).some((v) => v)) {
        data.push(row);
      }
    }

    return { headers, data };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, data } = parseCSV(text);

        if (headers.length === 0) {
          setError("No data found in CSV file");
          return;
        }

        if (data.length === 0) {
          setError("No rows found in CSV file");
          return;
        }

        setHeaders(headers);
        setCSVData(data);
        setStep("mapping");
        setError("");
      } catch (err) {
        setError(
          `Error parsing CSV: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (columnIndex: number, value: string) => {
    const newMapping = { ...mapping };
    if (value === "") {
      delete newMapping[columnIndex];
    } else {
      newMapping[columnIndex] = value;
    }
    setMapping(newMapping);
  };

  const handleSubmitMapping = () => {
    const hasMapping = Object.keys(mapping).length > 0;
    if (!hasMapping) {
      setError("Please map at least one column");
      return;
    }

    const hasTitleAndArtist =
      Object.values(mapping).includes("release_title") &&
      Object.values(mapping).includes("release_artist");

    if (!hasTitleAndArtist) {
      setError("Please map at least Release Title and Release Display Artist");
      return;
    }

    onMappingComplete(mapping, csvData);
  };

  if (step === "upload") {
    return (
      <div
        className={css`
          padding: 2rem;
          background: #f5f5f5;
          border-radius: 8px;
        `}
      >
        <h3>Upload CSV File</h3>
        <p>Upload a CSV file with track data to get started.</p>

        <Input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          name="csv-file"
        />

        <div
          className={css`
            margin-top: 1rem;
            padding: 1rem;
            background: #e3f2fd;
            border-radius: 4px;
            font-size: 0.9rem;
          `}
        >
          <strong>CSV Format:</strong>
          <p>Your CSV should have headers in the first row. Example:</p>
          <code>
            Release Title, Release Artist, Track Title, Track Number, Composer
          </code>
        </div>

        {error && (
          <div
            className={css`
              margin-top: 1rem;
              padding: 1rem;
              background: #ffebee;
              border: 1px solid #ef5350;
              border-radius: 4px;
              color: #c62828;
            `}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div
        className={css`
          padding: 2rem;
          background: #f5f5f5;
          border-radius: 8px;
        `}
      >
        <h3>Map CSV Columns</h3>
        <p>Link each column to the appropriate field type.</p>

        <div
          className={css`
            margin-top: 2rem;
            display: grid;
            gap: 1rem;
          `}
        >
          {headers.map((header, index) => (
            <div
              key={index}
              className={css`
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 1rem;
                align-items: center;
                padding: 1rem;
                background: white;
                border-radius: 4px;
              `}
            >
              <label
                className={css`
                  font-weight: 500;
                `}
              >
                {header}
              </label>
              <Select
                value={mapping[index] || ""}
                onChange={(e) => handleMappingChange(index, e.target.value)}
                options={FIELD_OPTIONS}
              />
            </div>
          ))}
        </div>

        {error && (
          <div
            className={css`
              margin-top: 1rem;
              padding: 1rem;
              background: #ffebee;
              border: 1px solid #ef5350;
              border-radius: 4px;
              color: #c62828;
            `}
          >
            {error}
          </div>
        )}

        <div
          className={css`
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
          `}
        >
          <Button
            onClick={() => {
              setStep("upload");
              setCSVData([]);
              setHeaders([]);
              setMapping({});
              setError("");
            }}
            variant="outlined"
          >
            Back
          </Button>
          <Button onClick={handleSubmitMapping} buttonRole="primary">
            Continue to Preview ({csvData.length} rows)
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default CSVUploadStep;
