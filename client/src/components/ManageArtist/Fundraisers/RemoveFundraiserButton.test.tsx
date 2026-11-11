import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { deleteFundraiser, ask } = vi.hoisted(() => ({
  deleteFundraiser: vi.fn(),
  ask: vi.fn(),
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
vi.mock("utils/useConfirm", () => ({ useConfirm: () => ({ ask }) }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, onClick, type, disabled }: any) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import RemoveFundraiserButton from "./RemoveFundraiserButton";

describe("RemoveFundraiserButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteFundraiser.mockResolvedValue({});
    ask.mockResolvedValue(true);
  });

  test("asks before cancelling a fundraiser that has pledges", async () => {
    ask.mockResolvedValue(false);
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

    expect(ask).toHaveBeenCalledWith("removingFundraiserWithPledgesWarning");
    expect(deleteFundraiser).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
  });

  test("asks before removing a fundraiser without pledges too", async () => {
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

    expect(ask).toHaveBeenCalledWith("removingFundraiserWarning");
    expect(deleteFundraiser).toHaveBeenCalledWith(7);
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  });
});
