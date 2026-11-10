import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key} ${opts.amount}` : key,
    i18n: { language: "en" },
  }),
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

import { FundraiserFormData } from "./fundraiserFormData";
import FundraiserFormFields from "./FundraiserFormFields";

const renderFields = (
  props: Partial<React.ComponentProps<typeof FundraiserFormFields>> = {}
) => {
  const Wrapper = () => {
    const methods = useForm<FundraiserFormData>({
      defaultValues: { goalAmount: "500" },
    });
    return (
      <FormProvider {...methods}>
        <FundraiserFormFields
          artistId={10}
          currency="usd"
          hasPledges={false}
          {...props}
        />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe("FundraiserFormFields", () => {
  test("doesn't ask for a minimum pledge, and shows the hint under the name", () => {
    renderFields({ nameHint: <p>URL hint</p> });
    expect(screen.queryByLabelText("minPledge")).not.toBeInTheDocument();
    expect(screen.getByText("URL hint")).toBeInTheDocument();
  });

  test("locks all-or-nothing once supporters have pledged", () => {
    renderFields({ hasPledges: true });
    expect(screen.getByLabelText("isAllOrNothing")).toBeDisabled();
    expect(
      screen.getByText(/isAllOrNothingLockedWithPledges/)
    ).toBeInTheDocument();
  });

  test("edits the description as rich text, without mentions", () => {
    renderFields();
    const editor = screen.getByLabelText("fundraiserDescription");
    expect(editor).toHaveAttribute("data-allow-mentions", "false");
    expect(editor).toHaveAttribute("data-artist-id", "10");
  });

  test("asks for an end date", () => {
    renderFields();
    expect(screen.getByLabelText("endDate")).toHaveAttribute("type", "date");
  });

  test("shows what's left of the goal after the platform and Stripe fees", async () => {
    renderFields({ platformPercent: 10 });
    expect(screen.getByText("lessPlatformFee $50.00")).toBeInTheDocument();
    expect(
      screen.getByText("lessStripeFeeEstimated $14.80")
    ).toBeInTheDocument();
    expect(screen.getByText("netMonthly $435.20")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("goal"));
    await userEvent.type(screen.getByLabelText("goal"), "1000");
    expect(screen.getByText("netMonthly $870.70")).toBeInTheDocument();
  });

  test("leaves out the platform fee when there's no percent or goal", async () => {
    const { unmount } = renderFields();
    expect(screen.queryByText(/lessPlatformFee/)).not.toBeInTheDocument();
    unmount();

    renderFields({ platformPercent: 10 });
    await userEvent.clear(screen.getByLabelText("goal"));
    expect(screen.queryByText(/lessPlatformFee/)).not.toBeInTheDocument();
  });

  test("focuses the goal when asked to", () => {
    renderFields({ focusGoal: true });
    expect(screen.getByLabelText("goal")).toHaveFocus();
  });
});
