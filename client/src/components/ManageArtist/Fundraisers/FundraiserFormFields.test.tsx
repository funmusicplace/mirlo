import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
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
      defaultValues: { goalAmount: "500", fundraiserMinPledge: "10" },
    });
    return (
      <FormProvider {...methods}>
        <FundraiserFormFields
          artistId={10}
          currency="usd"
          isAllOrNothing={false}
          hasPledges={false}
          {...props}
        />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe("FundraiserFormFields", () => {
  test("only asks for a minimum pledge on all-or-nothing fundraisers", () => {
    const { unmount } = renderFields({ isAllOrNothing: false });
    expect(screen.queryByLabelText("minPledge")).not.toBeInTheDocument();
    unmount();

    renderFields({ isAllOrNothing: true });
    expect(screen.getByLabelText("minPledge")).toHaveValue(10);
  });

  test("locks all-or-nothing once supporters have pledged", () => {
    renderFields({ isAllOrNothing: true, hasPledges: true });
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

  test("focuses the goal when asked to", () => {
    renderFields({ focusGoal: true });
    expect(screen.getByLabelText("goal")).toHaveFocus();
  });
});
