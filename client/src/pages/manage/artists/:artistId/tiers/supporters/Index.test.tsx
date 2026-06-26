import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const mockGetMany = vi.fn();
vi.mock("services/api", () => ({
  default: {
    getMany: (...args: unknown[]) => mockGetMany(...args),
  },
}));

vi.mock("utils/useArtistQuery", () => ({
  default: () => ({
    data: { id: 1, userId: 1, user: { currency: "usd" } },
  }),
}));

// Stub the wrapper + children that fetch / render heavy trees so the test
// focuses on the supporters table rendered by Supporters itself.
vi.mock("components/ManageArtist/ManageSectionWrapper", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return { __esModule: true, default: Wrapper, ManageSectionWrapper: Wrapper };
});
vi.mock("components/ManageArtist/ArtistSubscriberDataDownload", () => ({
  default: () => null,
}));
vi.mock("components/ManageArtist/ArtistSubscriberUploadData", () => ({
  default: () => null,
}));
vi.mock("components/common/DropdownMenu", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("pages/:artistId/Index", () => ({
  ArtistSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import Supporters from "./Index";

// ---- fixtures ---------------------------------------------------------------

const makeSupporter = (overrides: object = {}) => ({
  id: 1,
  user: { id: 11, name: "Test Fan", email: "fan@example.com" },
  amount: 500,
  artistSubscriptionTier: {
    isDefaultTier: false,
    interval: "MONTH",
    name: "Gold",
  },
  artistUserSubscriptionCharges: [{ id: "c1", transactionId: "txn_1" }],
  ...overrides,
});

// ---- helpers ----------------------------------------------------------------

const mockSubscribers = (results: object[]) => {
  mockGetMany.mockResolvedValue({ results });
};

// ---- tests ------------------------------------------------------------------

describe("Supporters", () => {
  beforeEach(() => {
    mockGetMany.mockReset();
  });

  test("shows a Free pill for a supporter with no associated transaction", async () => {
    mockSubscribers([
      makeSupporter({
        id: 1,
        user: { id: 11, name: "Paid Fan", email: "paid@example.com" },
        artistUserSubscriptionCharges: [{ id: "c1", transactionId: "txn_1" }],
      }),
      makeSupporter({
        id: 2,
        user: { id: 12, name: "Free Fan", email: "free@example.com" },
        amount: 0,
        artistUserSubscriptionCharges: [],
      }),
    ]);

    render(<Supporters />);

    // Wait for both supporters to be rendered after the async load.
    await screen.findByText("paid@example.com");
    await screen.findByText("free@example.com");

    // Exactly one supporter (the one without a transaction) is marked Free.
    expect(screen.getAllByText("free")).toHaveLength(1);
  });

  test("treats a charge without a transaction id as Free", async () => {
    mockSubscribers([
      makeSupporter({
        id: 3,
        user: { id: 13, name: "Pending Fan", email: "pending@example.com" },
        // A charge row exists but never got linked to a transaction.
        artistUserSubscriptionCharges: [{ id: "c2" }],
      }),
    ]);

    render(<Supporters />);

    await screen.findByText("pending@example.com");
    expect(screen.getAllByText("free")).toHaveLength(1);
  });

  test("does not show a Free pill for a fully paid supporter", async () => {
    mockSubscribers([
      makeSupporter({
        id: 4,
        user: { id: 14, name: "Paid Fan", email: "paid@example.com" },
        artistUserSubscriptionCharges: [{ id: "c3", transactionId: "txn_2" }],
      }),
    ]);

    render(<Supporters />);

    await screen.findByText("paid@example.com");
    expect(screen.queryByText("free")).not.toBeInTheDocument();
  });

  test("uses actual fees (no est. label) when charges have completed transactions", async () => {
    mockSubscribers([
      makeSupporter({
        id: 5,
        user: { id: 15, name: "Billed Fan", email: "billed@example.com" },
        artistUserSubscriptionCharges: [
          {
            id: "c4",
            transactionId: "txn_3",
            transaction: {
              platformCut: 35,
              stripeCut: 45,
              paymentStatus: "COMPLETED",
            },
          },
        ],
      }),
    ]);

    render(<Supporters />);

    await screen.findByText("billed@example.com");
    expect(screen.getByText("lessPlatformFee")).toBeInTheDocument();
    expect(screen.getByText("lessStripeFee")).toBeInTheDocument();
    expect(
      screen.queryByText("lessStripeFeeEstimated")
    ).not.toBeInTheDocument();
  });

  test("falls back to an estimated label when a paying supporter has no completed charge", async () => {
    mockSubscribers([
      makeSupporter({
        id: 6,
        user: { id: 16, name: "New Fan", email: "new@example.com" },
        // Paid (has a transaction id) but the charge has not settled yet.
        artistUserSubscriptionCharges: [{ id: "c5", transactionId: "txn_4" }],
      }),
    ]);

    render(<Supporters />);

    await screen.findByText("new@example.com");
    expect(screen.getByText("lessStripeFeeEstimated")).toBeInTheDocument();
  });
});
