import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Capture what gets sent to the API on save so we can assert the quantity value.
const { mockPut } = vi.hoisted(() => ({ mockPut: vi.fn() }));

vi.mock("services/api", () => ({ default: { put: mockPut } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useParams: () => ({ merchId: "merch-1" }) };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("queries", () => ({
  queryManagedMerch: vi.fn(() => ({ queryKey: ["managedMerch"] })),
}));

vi.mock("./DashedList", () => ({
  default: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
}));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, type, disabled, onClick }: any) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

import { useQuery } from "@tanstack/react-query";

import MerchOptions from "./MerchOptions";

// ---- helpers ----------------------------------------------------------------

// Renders with a single option type holding one option at the given quantity.
const renderWithQuantity = (quantityRemaining: number | null) => {
  vi.mocked(useQuery).mockReturnValue({
    data: {
      id: "merch-1",
      optionTypes: [
        {
          id: "ot1",
          optionName: "Size",
          options: [
            {
              id: "o1",
              name: "Large",
              additionalPrice: 100,
              quantityRemaining,
            },
          ],
        },
      ],
    },
  } as any);
  return render(<MerchOptions />);
};

const enterEditMode = () =>
  userEvent.click(screen.getByRole("button", { name: "edit" }));

const saveOptions = async () => {
  // The Edit button is also a submit button, so clear any prior call first to
  // isolate the save we care about.
  mockPut.mockClear();
  await userEvent.click(screen.getByRole("button", { name: "saveOptions" }));
};

const savedOptionQuantity = () => {
  const packet = mockPut.mock.calls.at(-1)?.[1] as Array<{
    options: Array<{ quantityRemaining: number | null }>;
  }>;
  return packet[0].options[0].quantityRemaining;
};

// ---- tests ------------------------------------------------------------------

describe("MerchOptions option quantity", () => {
  beforeEach(() => {
    mockPut.mockReset();
    mockPut.mockResolvedValue({ result: {} });
  });

  test("saves null (unlimited) when the option quantity is cleared", async () => {
    renderWithQuantity(5);
    await enterEditMode();

    await userEvent.clear(await screen.findByLabelText("quantity"));
    await saveOptions();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut).toHaveBeenCalledWith(
      "manage/merch/merch-1/optionTypes",
      expect.any(Array)
    );
    expect(savedOptionQuantity()).toBeNull();
  });

  test("saves 0 (none available) when the option quantity is set to 0", async () => {
    renderWithQuantity(5);
    await enterEditMode();

    const input = await screen.findByLabelText("quantity");
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await saveOptions();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(savedOptionQuantity()).toBe(0);
  });

  test("saves the entered number for limited option stock", async () => {
    renderWithQuantity(null);
    await enterEditMode();

    await userEvent.type(await screen.findByLabelText("quantity"), "7");
    await saveOptions();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(savedOptionQuantity()).toBe(7);
  });
});
