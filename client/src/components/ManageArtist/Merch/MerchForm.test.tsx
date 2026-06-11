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

vi.mock("services/useErrorHandler", () => ({ default: () => vi.fn() }));
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 1 } }),
}));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("utils/useFormPersist", () => ({
  useFormPersist: () => ({
    hasRestoredDraft: false,
    restoredFields: [],
    clearDraft: vi.fn(),
    discardDraft: vi.fn(),
    dismissBanner: vi.fn(),
  }),
}));
vi.mock("queries/queryKeys", () => ({ QUERY_KEY_MERCH: "merch" }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQueryClient: () => ({ invalidateQueries: vi.fn() }) };
});

// Child components that make their own API calls / have deep dependencies.
vi.mock("../ManageTrackGroup/AlbumFormComponents/PaymentSlider", () => ({
  default: () => null,
}));
vi.mock("./DownloadableContent", () => ({ default: () => null }));
vi.mock("./SelectTrackGroup", () => ({ default: () => null }));
vi.mock("components/common/DraftRestoredBanner", () => ({
  default: () => null,
}));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, type, disabled, onClick }: any) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

import MerchForm from "./MerchForm";

// ---- fixtures ---------------------------------------------------------------

const makeMerch = (overrides: object = {}) =>
  ({
    id: "merch-1",
    title: "T-Shirt",
    description: "A shirt",
    minPrice: 1000,
    quantityRemaining: 5,
    catalogNumber: "",
    platformPercent: 0,
    externalUrl: null,
    ...overrides,
  }) as unknown as Merch;

// ---- helpers ----------------------------------------------------------------

const renderForm = (merch: Merch) =>
  render(
    <MerchForm
      merch={merch}
      artist={{ id: 1 } as unknown as Artist}
      reload={() => Promise.resolve()}
    />
  );

const save = async () =>
  userEvent.click(screen.getByRole("button", { name: "saveMerch" }));

const savedQuantity = () =>
  (mockPut.mock.calls.at(-1)?.[1] as { quantityRemaining: number | null })
    .quantityRemaining;

// ---- tests ------------------------------------------------------------------

describe("MerchForm quantity", () => {
  beforeEach(() => {
    mockPut.mockReset();
    mockPut.mockResolvedValue({ result: {} });
  });

  test("saves null (unlimited) when the quantity field is cleared", async () => {
    renderForm(makeMerch({ quantityRemaining: 5 }));

    await userEvent.clear(screen.getByLabelText("quantity"));
    await save();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut).toHaveBeenCalledWith(
      "manage/merch/merch-1",
      expect.any(Object)
    );
    expect(savedQuantity()).toBeNull();
  });

  test("saves 0 (none available) when the quantity is set to 0", async () => {
    renderForm(makeMerch({ quantityRemaining: 5 }));

    const input = screen.getByLabelText("quantity");
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await save();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(savedQuantity()).toBe(0);
  });

  test("saves the entered number for limited stock", async () => {
    renderForm(makeMerch({ quantityRemaining: null }));

    await userEvent.type(screen.getByLabelText("quantity"), "7");
    await save();

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(savedQuantity()).toBe(7);
  });
});
