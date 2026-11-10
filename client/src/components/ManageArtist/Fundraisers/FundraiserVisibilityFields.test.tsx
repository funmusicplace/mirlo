import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import FundraiserVisibilityFields from "./FundraiserVisibilityFields";

const renderFields = (isPublic: boolean) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        fundraiserUrlSlug: "a-van",
        fundraiserIsPublic: isPublic,
      },
    });
    return (
      <MemoryRouter>
        <FormProvider {...methods}>
          <FundraiserVisibilityFields
            artist={{ id: 3, urlSlug: "tidal-hours" }}
            fundraiser={{ id: 7, urlSlug: "a-van", isPublic }}
          />
        </FormProvider>
      </MemoryRouter>
    );
  };
  return render(<Wrapper />);
};

describe("FundraiserVisibilityFields", () => {
  test("links to the page and warns about changing the URL once public", () => {
    renderFields(true);
    expect(screen.getByLabelText("isPublic")).toBeChecked();
    expect(screen.getByLabelText("urlSlug")).toHaveValue("a-van");
    expect(screen.getByRole("link", { name: "viewPage" })).toHaveAttribute(
      "href",
      "/tidal-hours/fundraiser/a-van"
    );
    expect(screen.getByText("urlSlugWarning")).toBeInTheDocument();
  });

  test("has no link or warning while the fundraiser is private", () => {
    renderFields(false);
    expect(screen.getByLabelText("isPublic")).not.toBeChecked();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("urlSlugWarning")).not.toBeInTheDocument();
  });
});
