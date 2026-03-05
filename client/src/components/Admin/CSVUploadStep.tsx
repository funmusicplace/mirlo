import React, { useState } from "react";
import { css } from "@emotion/css";
import Button from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { read, utils } from "xlsx";
import Papa from "papaparse";
import api from "services/api";

interface CSVUploadProps {
  onMappingComplete: (
    mapping: ColumnMapping,
    data: ParsedRow[],
    userId?: number
  ) => void;
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
  { value: "catalogNumber", label: "Catalog Number" },
  { value: "track_artist_role", label: "Track Artist Role (custom)" },
  { value: "isrc", label: "ISRC Code" },
  { value: "genre", label: "Genre" },
  { value: "description", label: "Description" },
  { value: "lyrics", label: "Lyrics" },
  { value: "release_date", label: "Release Date" },
  { value: "published_date", label: "Published Date" },
  { value: "min_price", label: "Minimum Price (cents)" },
  { value: "tags", label: "Tags (comma separated)" },
];

const CSVUploadStep: React.FC<CSVUploadProps> = ({ onMappingComplete }) => {
  const [csvData, setCSVData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<
    "selectUser" | "upload" | "mapping" | "review"
  >("selectUser");
  const [error, setError] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<number | undefined>();
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");

  const handleSelectUser = async () => {
    if (!userEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setUserLoading(true);
    setError("");

    try {
      const response = await api.getMany<User>(
        `admin/users?email=${encodeURIComponent(userEmail)}`
      );
      if (!response.results || response.results.length === 0) {
        setError("User not found");
        setUserLoading(false);
        return;
      }

      const user = response.results[0];
      setUserId(user.id);
      setSelectedUserEmail(user.email);
      setStep("upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error searching for user");
    } finally {
      setUserLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith(".csv")) {
        // Parse CSV
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const result = Papa.parse(text, { header: true });
            const parsedData = (result.data as any[]).filter((row: any) =>
              Object.values(row).some((v) => v)
            );

            if (
              !result.data?.[0] ||
              Object.keys(result.data[0] as any).length === 0
            ) {
              setError("No data found in CSV file");
              return;
            }

            if (parsedData.length === 0) {
              setError("No rows found in CSV file");
              return;
            }

            setHeaders(Object.keys(result.data[0] as any));
            setCSVData(parsedData as ParsedRow[]);
            setStep("mapping");
            setError("");
          } catch (err) {
            setError(
              `Error parsing CSV: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = utils.sheet_to_json(worksheet, {
          defval: "",
        }) as any[];
        if (excelData.length === 0) {
          setError("No rows found in Excel file");
          return;
        }

        setHeaders(Object.keys(excelData[0] as any));
        setCSVData(excelData as ParsedRow[]);
        setStep("mapping");
        setError("");
      } else {
        setError("Please upload a CSV, XLSX, or XLS file");
      }
    } catch (err) {
      setError(
        `Error processing file: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
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

    onMappingComplete(mapping, csvData, userId);
  };

  if (step === "selectUser") {
    return (
      <div
        className={css`
          padding: 2rem;
          background: #f5f5f5;
          border-radius: 8px;
          max-width: 500px;
        `}
      >
        <h3>Select User</h3>
        <p>Enter the email address of the user to attach these albums to.</p>

        <div
          className={css`
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
          `}
        >
          <Input
            type="email"
            placeholder="user@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            name="user-email"
          />
          <Button
            onClick={handleSelectUser}
            buttonRole="primary"
            disabled={userLoading}
          >
            {userLoading ? "Searching..." : "Search"}
          </Button>
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

  if (step === "upload") {
    return (
      <div
        className={css`
          padding: 2rem;
          background: #f5f5f5;
          border-radius: 8px;
        `}
      >
        <h3>Upload Spreadsheet File</h3>
        <p>Upload a CSV, XLSX, or XLS file with track data to get started.</p>

        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
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
                ${mapping[index]
                  ? "background-color: var(--mi-primary-color)"
                  : ""}
              `}
            >
              <label
                className={css`
                  font-weight: 500;
                `}
              >
                {index + 1}. {header}
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
