import { test, expect } from "vitest";
import { screen, waitFor } from "@testing-library/dom";

test("renders homepage", async () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);

  await import("./index");

  await waitFor(() => {
    expect(document.title).toEqual("Mirlo on Mirlo");
    expect(screen.queryByText("Log in")).toBeInTheDocument();
  });
});
