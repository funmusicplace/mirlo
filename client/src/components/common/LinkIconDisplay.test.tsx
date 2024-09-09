import { test, expect } from "vitest";
import { isEmailLink, linkUrlHref } from "./LinkIconDisplay";

test("isEmailLink returns true when a link is entered", () => {
  const result = isEmailLink("test@example.com");
  expect(result).toBe(true);
});

test("isEmailLink returns false when a URL is entered", () => {
  const result = isEmailLink("https://example.com");
  expect(result).toBe(false);
});

test("isEmailLink returns false when a URL containing an @ symbol is entered", () => {
  const result = isEmailLink("example.com/@example.com");
  expect(result).toBe(false);
});

test("isEmailLink returns true when any string is prefixed with mailto", () => {
  const result = isEmailLink(
    "mailto:https://this.is.actually/@an.email.example.com"
  );
  expect(result).toBe(true);
});

test("linkUrlHref adds an https prefix to links that don't have one", () => {
  const result = linkUrlHref("example.com");
  expect(result).toBe("https://example.com");
});

test("linkUrlHref doesn't affect links that already have an http prefix", () => {
  const result = linkUrlHref("http://example.com");
  expect(result).toBe("http://example.com");
});

test("linkUrlHref doesn't affect emails that already have a mailto prefix", () => {
  const result = linkUrlHref("mailto:test@example.com");
  expect(result).toBe("mailto:test@example.com");
});
