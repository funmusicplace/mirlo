import { describe, expect, it } from "vitest";

import { shouldConfirmPublishDate } from "./PublishPostButton";

// The form's publishedAt is a datetime-local value, so "YYYY-MM-DDTHH:mm" read
// in the viewer's own timezone.
const NOW = new Date(2026, 8, 11, 14, 30);

describe("shouldConfirmPublishDate", () => {
  it("does not ask when the date is earlier the same day", () => {
    // A draft's publishedAt defaults to when it was created, so this is the
    // ordinary case of writing a post and publishing it. See #2218.
    expect(shouldConfirmPublishDate("2026-09-11T09:00", NOW)).toBe(false);
  });

  it("does not ask at the very start of today", () => {
    expect(shouldConfirmPublishDate("2026-09-11T00:00", NOW)).toBe(false);
  });

  it("asks when the date is an earlier day", () => {
    expect(shouldConfirmPublishDate("2026-09-10T23:59", NOW)).toBe(true);
    expect(shouldConfirmPublishDate("2026-08-20T12:00", NOW)).toBe(true);
  });

  it("does not ask when the date is scheduled ahead", () => {
    expect(shouldConfirmPublishDate("2026-09-11T18:00", NOW)).toBe(false);
    expect(shouldConfirmPublishDate("2026-10-01T09:00", NOW)).toBe(false);
  });

  it("does not ask when the date can't be read", () => {
    expect(shouldConfirmPublishDate("", NOW)).toBe(false);
    expect(shouldConfirmPublishDate("not a date", NOW)).toBe(false);
  });
});
