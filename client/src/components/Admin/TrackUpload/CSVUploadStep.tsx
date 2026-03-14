import React, { useState } from "react";
import Button from "../../common/Button";
import Box from "../../common/Box";
import { Input } from "../../common/Input";
import { Select } from "../../common/Select";
import StepCard from "../../common/StepCard";
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
  { value: "", label: "Skip this column", required: false },
  { value: "release_title", label: "Release Title", required: true },
  { value: "release_artist", label: "Release Display Artist", required: true },
  { value: "track_title", label: "Track Title", required: true },
  { value: "track_number", label: "Track Number", required: true },
  { value: "catalogNumber", label: "Catalog Number", required: false },
  {
    value: "track_artist_role",
    label: "Track Artist Role (custom)",
    required: false,
  },
  { value: "isrc", label: "ISRC Code", required: false },
  { value: "genre", label: "Genre", required: false },
  { value: "description", label: "Description", required: false },
  { value: "lyrics", label: "Lyrics", required: false },
  { value: "release_date", label: "Release Date", required: false },
  { value: "published_date", label: "Published Date", required: false },
  { value: "min_price", label: "Minimum Price (cents)", required: false },
  { value: "tags", label: "Tags (comma separated)", required: false },
];

const ALWAYS_AVAILABLE_FIELD_VALUES = new Set(["track_artist_role"]);

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

  const selectedFieldValues = new Set(
    Object.values(mapping).filter((value) => value !== "")
  );

  const requiredFieldOptions = FIELD_OPTIONS.filter(
    (option) => option.required && option.value !== ""
  );

  const missingRequiredFieldOptions = requiredFieldOptions.filter(
    (option) => !selectedFieldValues.has(option.value)
  );

  const getFieldOptionsForColumn = (columnIndex?: number) => {
    return FIELD_OPTIONS.filter(
      (option) =>
        option.value === "" ||
        ALWAYS_AVAILABLE_FIELD_VALUES.has(option.value) ||
        (columnIndex !== undefined && option.value === mapping[columnIndex]) ||
        !selectedFieldValues.has(option.value)
    );
  };

  const handleSubmitMapping = () => {
    if (missingRequiredFieldOptions.length > 0) {
      const missingLabels = missingRequiredFieldOptions
        .map((option) => option.label)
        .join(", ");
      setError(`Please map all required fields: ${missingLabels}`);
      return;
    }

    onMappingComplete(mapping, csvData, userId);
  };

  if (step === "selectUser") {
    return (
      <StepCard className="max-w-[500px]">
        <h3>Select User</h3>
        <p>Enter the email address of the user to attach these albums to.</p>

        <div className="mt-4 flex gap-4">
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
          <div className="mt-4">
            <Box variant="warning">{error}</Box>
          </div>
        )}
      </StepCard>
    );
  }

  if (step === "upload") {
    return (
      <StepCard>
        <h3>Upload Spreadsheet File</h3>
        <p>Upload a CSV, XLSX, or XLS file with track data to get started.</p>

        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          name="csv-file"
        />

        <div className="mt-4 rounded bg-[#e3f2fd] p-4 text-sm">
          <strong>CSV Format:</strong>
          <p>Your CSV should have headers in the first row. Example:</p>
          <code>
            Release Title, Release Artist, Track Title, Track Number, Composer
          </code>
        </div>

        {error && (
          <div className="mt-4">
            <Box variant="warning">{error}</Box>
          </div>
        )}
      </StepCard>
    );
  }

  if (step === "mapping") {
    return (
      <StepCard>
        <h3>Map CSV Columns</h3>
        <p>Link each column to the appropriate field type.</p>

        <div className="mt-8 grid gap-4">
          {headers.map((header, index) => (
            <div
              key={index}
              className={`grid grid-cols-[1fr_2fr] items-center gap-4 rounded p-4 ${
                mapping[index] ? "bg-[var(--mi-primary-color)]" : "bg-white"
              }`}
            >
              <label className="font-medium">
                {mapping[index] && "✔️"}
                {index + 1}. {header}
              </label>
              <Select
                value={mapping[index] || ""}
                onChange={(e) => handleMappingChange(index, e.target.value)}
                options={getFieldOptionsForColumn(index)}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4">
            <Box variant="warning">{error}</Box>
          </div>
        )}

        <div className="mt-8 flex gap-4">
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
          <Box
            variant={
              missingRequiredFieldOptions.length > 0 ? "warning" : "success"
            }
          >
            {missingRequiredFieldOptions.length > 0
              ? `Required fields not mapped: ${missingRequiredFieldOptions
                  .map((option) => option.label)
                  .join(", ")}`
              : "All required fields are mapped."}
          </Box>
          <Button
            onClick={handleSubmitMapping}
            buttonRole="primary"
            disabled={missingRequiredFieldOptions.length > 0}
          >
            Continue to Preview ({csvData.length} rows)
          </Button>
        </div>
      </StepCard>
    );
  }

  return null;
};

export default CSVUploadStep;
