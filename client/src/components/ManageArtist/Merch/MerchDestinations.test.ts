import { test, expect } from "vitest";
import { countryNameToCode } from "./MerchDestinations";

test("countryNameToCode returns the ISO code for a known country name", () => {
  expect(countryNameToCode("United States")).toBe("US");
  expect(countryNameToCode("Canada")).toBe("CA");
  expect(countryNameToCode("Germany")).toBe("DE");
});

test("countryNameToCode is case-insensitive and trims whitespace", () => {
  expect(countryNameToCode("united states")).toBe("US");
  expect(countryNameToCode(" Canada ")).toBe("CA");
});

test("countryNameToCode returns undefined for unknown or empty values", () => {
  expect(countryNameToCode(undefined)).toBeUndefined();
  expect(countryNameToCode(null)).toBeUndefined();
  expect(countryNameToCode("")).toBeUndefined();
  expect(countryNameToCode("Atlantis")).toBeUndefined();
});
