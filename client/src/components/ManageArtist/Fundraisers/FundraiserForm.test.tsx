import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { updateFundraiser } = vi.hoisted(() => ({
  updateFundraiser: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key} ${opts.amount}` : key,
    i18n: { language: "en" },
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
vi.mock("./FundraiserActions", () => ({ default: () => null }));
vi.mock("./FundraiserImagesEditor", () => ({
  default: () => <div data-testid="images-editor" />,
}));
vi.mock("components/common/TextEditor", () => ({
  default: ({ label, value, onChange, allowMentions, artistId }: any) => (
    <textarea
      aria-label={label}
      data-allow-mentions={String(allowMentions)}
      data-artist-id={artistId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, type, disabled }: any) => (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  ),
}));

import FundraiserForm from "./FundraiserForm";

const FUNDRAISER = {
  id: 7,
  name: "New van",
  description: "",
  goalAmount: 50000,
  minPledge: 1000,
  isAllOrNothing: true,
  status: "ACTIVE",
  endDate: "",
  amountRaised: 12000,
  pledgeCount: 0,
  trackGroups: [],
} as unknown as ManagedFundraiser;

const renderForm = (
  fundraiser: ManagedFundraiser = FUNDRAISER,
  defaultPlatformFee?: number
) =>
  render(
    <MemoryRouter>
      <FundraiserForm
        artistId={10}
        fundraiser={fundraiser}
        currency="usd"
        defaultPlatformFee={defaultPlatformFee}
        onRemoved={vi.fn()}
      />
    </MemoryRouter>
  );

describe("FundraiserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateFundraiser.mockResolvedValue({});
  });

  test("saves changes in cents", async () => {
    renderForm();
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();

    const goal = screen.getByLabelText("goal");
    await userEvent.clear(goal);
    await userEvent.type(goal, "750.25");
    await userEvent.type(
      screen.getByLabelText("fundraiserDescription"),
      "<p>Hi</p>"
    );
    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() =>
      expect(updateFundraiser).toHaveBeenCalledWith({
        fundraiserId: 7,
        body: expect.objectContaining({
          name: "New van",
          description: "<p>Hi</p>",
          goalAmount: 75025,
          minPledge: 1000,
          isAllOrNothing: true,
        }),
      })
    );
  });

  test("lists the releases the fundraiser is linked to", () => {
    renderForm({
      ...FUNDRAISER,
      trackGroups: [{ id: 4, title: "Tidal Hours" }] as TrackGroup[],
    });
    expect(screen.getByRole("link", { name: "Tidal Hours" })).toHaveAttribute(
      "href",
      "/manage/artists/10/release/4"
    );
  });

  test("takes the platform fee from the linked release, or else the artist's default", () => {
    const { unmount } = renderForm(FUNDRAISER, 10);
    expect(screen.getByText("lessPlatformFee $50.00")).toBeInTheDocument();
    unmount();

    renderForm(
      {
        ...FUNDRAISER,
        trackGroups: [
          { id: 4, title: "Tidal Hours", platformPercent: 5 },
        ] as TrackGroup[],
      },
      10
    );
    expect(screen.getByText("lessPlatformFee $25.00")).toBeInTheDocument();
  });
});
