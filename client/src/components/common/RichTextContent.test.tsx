import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("./LazyIframe", () => ({
  default: (props: any) => (
    <div data-testid="lazy-iframe" data-src={props.src} />
  ),
}));

import RichTextContent from "./RichTextContent";

describe("RichTextContent", () => {
  test("renders formatted text", () => {
    render(
      <RichTextContent html="<h2>Why</h2><p>We <strong>need</strong> a van</p>" />
    );
    expect(screen.getByRole("heading", { name: "Why" })).toBeInTheDocument();
    expect(screen.getByText("need").tagName).toBe("STRONG");
  });

  test("loads embedded videos and players lazily", () => {
    render(
      <RichTextContent html='<iframe src="https://www.youtube.com/embed/abc" loading="eager"></iframe>' />
    );
    expect(screen.getByTestId("lazy-iframe")).toHaveAttribute(
      "data-src",
      "https://www.youtube.com/embed/abc"
    );
  });
});
