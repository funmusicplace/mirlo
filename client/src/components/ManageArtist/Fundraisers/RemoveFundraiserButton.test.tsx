import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { deleteFundraiser } = vi.hoisted(() => ({
  deleteFundraiser: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("queries", () => ({
  useDeleteFundraiserMutation: () => ({
    mutateAsync: deleteFundraiser,
    isPending: false,
  }),
}));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, onClick, type }: any) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

import RemoveFundraiserButton from "./RemoveFundraiserButton";

describe("RemoveFundraiserButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteFundraiser.mockResolvedValue({});
  });

  test("asks before cancelling a fundraiser that has pledges", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onRemoved = vi.fn();
    render(
      <RemoveFundraiserButton
        fundraiserId={7}
        pledgeCount={2}
        onRemoved={onRemoved}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "cancelFundraiser" })
    );

    expect(confirm).toHaveBeenCalled();
    expect(deleteFundraiser).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  test("removes a fundraiser without pledges straight away", async () => {
    const onRemoved = vi.fn();
    render(
      <RemoveFundraiserButton
        fundraiserId={7}
        pledgeCount={0}
        onRemoved={onRemoved}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "removeFundraiser" })
    );

    expect(deleteFundraiser).toHaveBeenCalledWith(7);
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  });
});
