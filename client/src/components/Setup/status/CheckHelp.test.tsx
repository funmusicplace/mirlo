import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi } from "vitest";

import CheckHelp from "./CheckHelp";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("CheckHelp", () => {
  test("reveals the explanation on demand and announces its state", async () => {
    render(
      <CheckHelp
        id="check-help-redis"
        label="Job queue"
        detail="Connected."
        text="Redis is a small program."
      />
    );

    const toggle = screen.getByRole("button", { name: "helpToggle" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Redis is a small program.")).not.toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "check-help-redis");
    expect(screen.getByText("Redis is a small program.")).toBeVisible();
    expect(screen.getByText("Redis is a small program.")).toHaveAttribute(
      "id",
      "check-help-redis"
    );

    await userEvent.click(toggle);
    expect(screen.getByText("Redis is a small program.")).not.toBeVisible();
  });
});
