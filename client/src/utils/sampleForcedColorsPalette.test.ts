import { afterEach, describe, expect, it, vi } from "vitest";

import {
  contrastingBlackOrWhite,
  sampleForcedColorsPalette,
} from "./sampleForcedColorsPalette";

describe("contrastingBlackOrWhite", () => {
  it("picks white on a dark surface", () => {
    expect(contrastingBlackOrWhite("#0000ee")).toBe("#ffffff");
  });

  it("picks black on a light surface", () => {
    expect(contrastingBlackOrWhite("#ffff00")).toBe("#000000");
  });
});

describe("sampleForcedColorsPalette", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps system colors into artist slots", () => {
    const colorMap: Record<string, string> = {
      CanvasText: "rgb(10, 20, 30)",
      LinkText: "rgb(0, 0, 238)",
    };
    const bgMap: Record<string, string> = {
      Canvas: "rgb(255, 255, 255)",
    };

    vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
      const key = (el as HTMLElement).dataset.miSystemColor ?? "";
      return {
        color: colorMap[key] ?? "rgb(0, 0, 0)",
        backgroundColor: bgMap[key] ?? "rgb(255, 255, 255)",
      } as CSSStyleDeclaration;
    });

    expect(sampleForcedColorsPalette()).toEqual({
      background: "#ffffff",
      text: "#0a141e",
      secondaryText: "#0a141e",
      button: "#0000ee",
      buttonText: "#ffffff",
    });
  });
});
