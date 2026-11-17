import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SpamChallenge from "./SpamChallenge";

const siteKey = vi.hoisted(() => ({ value: "" }));

vi.mock("queries/instanceSettings", () => ({
  useTurnstileSiteKey: () => siteKey.value,
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ siteKey }: { siteKey: string }) => (
    <div data-testid="turnstile">{siteKey}</div>
  ),
}));

describe("SpamChallenge", () => {
  it("renders nothing when no site key is configured", () => {
    siteKey.value = "";
    const { container } = render(<SpamChallenge onSuccess={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the challenge with the configured site key", () => {
    siteKey.value = "0xadmin";
    render(<SpamChallenge onSuccess={vi.fn()} />);

    expect(screen.getByTestId("turnstile")).toHaveTextContent("0xadmin");
  });
});
