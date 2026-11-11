import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { useFormContext } from "react-hook-form";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { startPurchase, auth } = vi.hoisted(() => ({
  startPurchase: vi.fn(),
  auth: { user: { id: 1 } as unknown },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { minPrice?: string }) =>
      opts?.minPrice ? `${key} ${opts.minPrice}` : key,
  }),
}));
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({ checkout: null, startPurchase }),
}));
vi.mock("state/AuthContext", () => ({ useAuthContext: () => auth }));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));
vi.mock("components/common/EmailVerification", () => ({
  default: () => <div data-testid="email-verification" />,
}));
vi.mock("components/TrackGroup/PaymentInputElement", () => ({
  default: function PaymentInputElement() {
    const { register } = useFormContext();
    return <input aria-label="amount" {...register("chosenPrice")} />;
  },
}));

import FundraiserPledgeForm from "./FundraiserPledgeForm";

const FUNDRAISER = {
  id: 7,
  name: "A van",
  minPledge: 2500,
  artist: { id: 3, name: "The Tidal Hours", user: { currency: "usd" } },
} as unknown as PublicFundraiser;

const renderForm = () =>
  render(
    <FundraiserPledgeForm
      fundraiser={FUNDRAISER}
      platformPercent={7}
      returnUrl="http://localhost/tidal-hours/fundraiser/a-van"
      onPledged={vi.fn()}
    />
  );

describe("FundraiserPledgeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 1 };
  });

  test("pledges the chosen amount in cents once the supporter agrees", async () => {
    renderForm();
    const submit = screen.getByRole("button", {
      name: "addPaymentInformation",
    });
    expect(screen.getByLabelText("amount")).toHaveValue("25");
    expect(submit).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("amount"));
    await userEvent.type(screen.getByLabelText("amount"), "40.5");
    await userEvent.click(screen.getByLabelText("consentToStoreData"));
    await userEvent.click(submit);

    expect(startPurchase).toHaveBeenCalledWith({
      artistId: 3,
      items: [
        {
          type: "fundraiserPledge",
          fundraiserId: 7,
          price: "4050",
          message: "",
        },
      ],
      email: undefined,
    });
  });

  test("won't pledge less than the minimum", async () => {
    renderForm();
    await userEvent.clear(screen.getByLabelText("amount"));
    await userEvent.type(screen.getByLabelText("amount"), "10");
    await userEvent.click(screen.getByLabelText("consentToStoreData"));

    expect(screen.getByText("lessThanMin $25.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "addPaymentInformation" })
    ).toBeDisabled();
  });

  test("asks a logged-out supporter to verify their email first", () => {
    auth.user = undefined;
    renderForm();
    expect(screen.getByTestId("email-verification")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "addPaymentInformation" })
    ).not.toBeInTheDocument();
  });
});
