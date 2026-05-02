import { test, expect } from "vitest";
import { formatAcceptList } from "./uploadFormats";

test("dedupes audio variants down to canonical extensions", () => {
  expect(
    formatAcceptList(
      "audio/flac,audio/wav,audio/x-wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
    )
  ).toBe("FLAC, WAV, AAC, AIFF, M4A");
});

test("renames audio/mpeg to MP3", () => {
  expect(formatAcceptList("audio/mpeg,audio/wav")).toBe("MP3, WAV");
});

test("collapses image/* to Images", () => {
  expect(formatAcceptList("image/*")).toBe("Images");
});

test("uses subtype for specific image mimes", () => {
  expect(formatAcceptList("image/jpeg,image/png")).toBe("JPEG, PNG");
});

test("renders application/pdf as PDF", () => {
  expect(formatAcceptList("application/pdf,image/*")).toBe("PDF, Images");
});

test("uppercases bare extension shorthand", () => {
  expect(formatAcceptList(".csv,.xlsx,.xls")).toBe("CSV, XLSX, XLS");
});

test("returns empty string for empty/missing input", () => {
  expect(formatAcceptList()).toBe("");
  expect(formatAcceptList("")).toBe("");
  expect(formatAcceptList("   ")).toBe("");
});

test("trims whitespace and tolerates uppercase MIME", () => {
  expect(formatAcceptList(" Image/JPEG , image/PNG ")).toBe("JPEG, PNG");
});
