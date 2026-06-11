import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("queries", () => ({
  queryManagedArtistSubscriptionTiers: vi.fn(() => ({ queryKey: ["tiers"] })),
}));

// Render the modal contents inline regardless of open state so the tier
// selector and upload controls are queryable without driving the dropdown.
vi.mock("components/common/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("react-papaparse", () => ({
  useCSVReader: () => ({
    CSVReader: ({ children }: { children: (props: any) => React.ReactNode }) =>
      children({
        getRootProps: () => ({}),
        acceptedFile: null,
        ProgressBar: () => null,
        getRemoveFileProps: () => ({}),
      }),
  }),
}));

const mockPost = vi.fn();
vi.mock("services/api", () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => vi.fn(),
}));

vi.mock("state/ArtistContext", () => ({
  useArtistContext: () => ({
    state: { artist: { id: 1, userId: 5, name: "Test Artist" } },
  }),
}));

import { useQuery } from "@tanstack/react-query";

import ArtistSubscriberUploadData from "./ArtistSubscriberUploadData";

// ---- fixtures ---------------------------------------------------------------

const tiers = [
  { id: 1, name: "Followers", isDefaultTier: true, interval: "MONTH" },
  { id: 2, name: "Gold", isDefaultTier: false, interval: "MONTH" },
];

const mockTiers = (results: object[] = tiers) => {
  vi.mocked(useQuery).mockImplementation(() => ({ data: { results } }) as any);
};

// ---- tests ------------------------------------------------------------------

describe("ArtistSubscriberUploadData", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ message: "Success" });
    mockTiers();
  });

  test("renders an option for each tier and defaults to the default tier", () => {
    render(<ArtistSubscriberUploadData onDone={vi.fn()} />);

    const select = screen.getByRole("combobox");
    // Default selection is the isDefaultTier ("Followers", id 1).
    expect(select).toHaveValue("1");

    expect(screen.getByRole("option", { name: "Gold" })).toBeInTheDocument();
    // The default tier's label is built with the tierFollowLabel key.
    expect(
      screen.getByRole("option", { name: "tierFollowLabel" })
    ).toBeInTheDocument();
  });

  test("posts the default tier id when uploading pasted emails", async () => {
    const user = userEvent.setup();
    render(<ArtistSubscriberUploadData onDone={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText("email1@example.com, email2@example.com"),
      "fan@example.com"
    );
    await user.click(screen.getByRole("button", { name: "next" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("manage/artists/1/subscribers", {
        subscribers: [{ email: "fan@example.com" }],
        artistSubscriptionTierId: 1,
      })
    );
  });

  test("posts the chosen tier id after selecting a different tier", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ArtistSubscriberUploadData onDone={onDone} />);

    await user.selectOptions(screen.getByRole("combobox"), "2");

    await user.type(
      screen.getByPlaceholderText("email1@example.com, email2@example.com"),
      "fan@example.com"
    );
    await user.click(screen.getByRole("button", { name: "next" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("manage/artists/1/subscribers", {
        subscribers: [{ email: "fan@example.com" }],
        artistSubscriptionTierId: 2,
      })
    );
    expect(onDone).toHaveBeenCalled();
  });

  test("does not render the tier selector when there are no tiers", () => {
    mockTiers([]);
    render(<ArtistSubscriberUploadData onDone={vi.fn()} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
