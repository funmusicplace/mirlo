import { afterEach, describe, expect, test, vi } from "vitest";

import { markSetupGuideSeen, wasSetupGuideSeen } from "./setupGuideSeen";

describe("setupGuideSeen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test("still remembers the choice when the storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

    expect(wasSetupGuideSeen()).toBe(false);
    markSetupGuideSeen();
    expect(wasSetupGuideSeen()).toBe(true);
  });
});
