import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { updateFundraiser } = vi.hoisted(() => ({
  updateFundraiser: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("queries", () => ({
  useUpdateFundraiserMutation: () => ({
    mutateAsync: updateFundraiser,
    isPending: false,
  }),
}));
vi.mock("services/useErrorHandler", () => ({ default: () => vi.fn() }));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, onClick, type }: any) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

import FundraiserPublicButton from "./FundraiserPublicButton";

const renderButton = (isPublic: boolean) =>
  render(
    <MemoryRouter>
      <FundraiserPublicButton
        artist={{ id: 3, urlSlug: "tidal-hours" }}
        fundraiser={{ id: 7, urlSlug: "a-van", isPublic }}
      />
    </MemoryRouter>
  );

describe("FundraiserPublicButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateFundraiser.mockResolvedValue({});
  });

  test("makes a private fundraiser public straight away", async () => {
    renderButton(false);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "makePublic" }));

    expect(updateFundraiser).toHaveBeenCalledWith({
      fundraiserId: 7,
      body: { isPublic: true },
    });
  });

  test("makes a public fundraiser private, and links to its page", async () => {
    renderButton(true);
    expect(screen.getByRole("link", { name: "viewPage" })).toHaveAttribute(
      "href",
      "/tidal-hours/fundraiser/a-van"
    );

    await userEvent.click(screen.getByRole("button", { name: "makePrivate" }));

    expect(updateFundraiser).toHaveBeenCalledWith({
      fundraiserId: 7,
      body: { isPublic: false },
    });
  });
});
