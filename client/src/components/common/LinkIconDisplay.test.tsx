import { test, expect } from "vitest";
import { isEmailLink, linkUrlDisplay, linkUrlHref } from "./LinkIconDisplay";

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

test.each([
  {url: "test@example.com", linkType: "Email"},
  {url: "test@example.com", linkType: "Website"}
])("linkUrlDisplay returns Email when link is e-mail", (link) => {
  const result = linkUrlDisplay(link);
  expect(result).toBe("Email");
});

test("linkUrlDisplay ignores Email linkType if url is not e-mail", () => {
  const result = linkUrlDisplay({url: "https://example.com", linkType: "Email"});
  expect(result).toBe("Website");
});

test("linkUrlDisplay returns linkType if set", () => {
  const result = linkUrlDisplay({url: "https://www.example.com/", linkType: "Anything"});
  expect(result).toBe("Anything");
})

test.each([
  [{url: "http://mastodon.social/", linkType: undefined}, "Mastodon"],
  [{url: "https://www.twitter.com/", linkType: undefined}, "Twitter"],
  [{url: "https://www.x.com/", linkType: undefined}, "X"],
  [{url: "https://www.facebook.com/", linkType: undefined}, "Facebook"],
  [{url: "https://www.bandcamp.com/", linkType: undefined}, "Bandcamp"],
  [{url: "https://www.instagram.com/", linkType: undefined}, "Instagram"],
  [{url: "@", linkType: undefined}, "Email"],
  [{url: "http://example.com/", linkType: undefined}, "Website"],
])("linkUrlDisplay guesses linkType when not set", (link, expected) => {
  const result = linkUrlDisplay(link);
  expect(result).toBe(expected);
});