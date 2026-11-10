import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { updateFundraiser } = vi.hoisted(() => ({
  updateFundraiser: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { url?: string }) =>
      opts?.url ? `${key} ${opts.url}` : key,
  }),
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
vi.mock("components/common/Modal", () => ({
  default: ({ open, children }: any) =>
    open ? <div role="dialog">{children}</div> : null,
}));

import FundraiserUrlField from "./FundraiserUrlField";

const renderField = (isPublic = false) =>
  render(
    <FundraiserUrlField
      artist={{ id: 3, urlSlug: "tidal-hours" }}
      fundraiser={{ id: 7, urlSlug: "a-van", isPublic }}
    />
  );

const openModal = () =>
  userEvent.click(screen.getByRole("button", { name: /\/fundraiser\/a-van$/ }));

describe("FundraiserUrlField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateFundraiser.mockResolvedValue({});
  });

  test("shows the URL, and edits the slug in a pop-up that saves straight away", async () => {
    renderField();
    expect(
      screen.getByRole("button", {
        name: `${window.location.origin}/tidal-hours/fundraiser/a-van`,
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("urlSlug")).not.toBeInTheDocument();

    await openModal();
    const input = screen.getByLabelText("urlSlug");
    expect(input).toHaveValue("a-van");
    await userEvent.clear(input);
    await userEvent.type(input, "new-van");
    await userEvent.click(screen.getByRole("button", { name: "saveUrl" }));

    expect(updateFundraiser).toHaveBeenCalledWith({
      fundraiserId: 7,
      body: { urlSlug: "new-van" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  test("keeps the pop-up open and says so when the URL is taken", async () => {
    updateFundraiser.mockRejectedValue(
      new MirloFetchError(new Response(null, { status: 400 }), "taken")
    );
    renderField();
    await openModal();
    await userEvent.click(screen.getByRole("button", { name: "saveUrl" }));

    expect(await screen.findByText("urlSlugTaken")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("warns that changing a public fundraiser's URL breaks links", async () => {
    renderField(true);
    await openModal();
    expect(screen.getByText("urlSlugWarning")).toBeInTheDocument();
  });
});
