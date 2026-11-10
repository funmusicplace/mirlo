import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({ children, onClick, type }: any) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

import FundraiserUrlField from "./FundraiserUrlField";

const Wrapper: React.FC<{ isPublic: boolean }> = ({ isPublic }) => {
  const methods = useForm({ defaultValues: { urlSlug: "a-van" } });
  return (
    <FormProvider {...methods}>
      <FundraiserUrlField
        artist={{ id: 3, urlSlug: "tidal-hours" }}
        fundraiser={{ id: 7, urlSlug: "a-van", isPublic }}
      />
    </FormProvider>
  );
};

describe("FundraiserUrlField", () => {
  test("shows the URL and edits it as part of the form", async () => {
    render(<Wrapper isPublic={false} />);
    expect(
      screen.getByText(/\/tidal-hours\/fundraiser\/a-van/)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("urlSlug")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "changeUrl" }));
    const input = screen.getByLabelText("urlSlug");
    expect(input).toHaveValue("a-van");
    await userEvent.clear(input);
    await userEvent.type(input, "new-van");

    expect(
      screen.getByText(/\/tidal-hours\/fundraiser\/new-van/)
    ).toBeInTheDocument();
    expect(screen.queryByText("urlSlugWarning")).not.toBeInTheDocument();
  });

  test("warns that changing a public fundraiser's URL breaks links", async () => {
    render(<Wrapper isPublic />);
    await userEvent.click(screen.getByRole("button", { name: "changeUrl" }));
    expect(screen.getByLabelText("urlSlug")).toHaveAccessibleDescription(
      "urlSlugWarning"
    );
  });
});
