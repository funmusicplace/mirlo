import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { fundraiserToFormData } from "./fundraiserFormData";
import { ARTIST, VAN } from "./fundraiserStoryFixtures";
import FundraiserVisibilityFields from "./FundraiserVisibilityFields";

type Fundraiser = React.ComponentProps<
  typeof FundraiserVisibilityFields
>["fundraiser"];

const WithForm: React.FC<{ fundraiser: Fundraiser }> = ({ fundraiser }) => {
  const methods = useForm({ defaultValues: fundraiserToFormData(fundraiser) });
  return (
    <FormProvider {...methods}>
      <form>
        <FundraiserVisibilityFields artist={ARTIST} fundraiser={fundraiser} />
      </form>
    </FormProvider>
  );
};

/**
 * Whether the fundraiser's page is public, and the URL it lives at. Like an
 * album's URL, the slug only changes when the artist edits it.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserVisibilityFields",
  component: WithForm,
  parameters: { layout: "padded" },
  args: { fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: false } },
} satisfies Meta<typeof WithForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Private: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Public")).not.toBeChecked();
    await expect(canvas.getByLabelText("Fundraiser URL")).toHaveValue("a-van");
    await expect(
      canvas.queryByRole("link", { name: "View the fundraiser's page" })
    ).not.toBeInTheDocument();
  },
};

/** Public: links to the page, and warns that changing the URL breaks links */
export const Public: Story = {
  args: { fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Public")).toBeChecked();
    await expect(
      canvas.getByRole("link", { name: "View the fundraiser's page" })
    ).toHaveAttribute("href", "/tidal-hours/fundraiser/a-van");
    await expect(
      canvas.getByText(/will break existing links/)
    ).toBeInTheDocument();
  },
};
