import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { fundraiserToFormData } from "./fundraiserFormData";
import FundraiserFormFields from "./FundraiserFormFields";
import { ARTIST, VAN, VINYL } from "./fundraiserStoryFixtures";

type Props = React.ComponentProps<typeof FundraiserFormFields> & {
  fundraiser: FundraiserSummary;
};

const WithForm: React.FC<Props> = ({ fundraiser, ...props }) => {
  const methods = useForm({ defaultValues: fundraiserToFormData(fundraiser) });
  return (
    <FormProvider {...methods}>
      <form className="flex flex-col gap-2">
        <FundraiserFormFields {...props} />
      </form>
    </FormProvider>
  );
};

/**
 * The fields shared by a release's fundraiser section and the fundraiser
 * edit page.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserFormFields",
  component: WithForm,
  parameters: { layout: "padded" },
  args: {
    artistId: ARTIST.id,
    fundraiser: VAN,
    currency: "usd",
    hasPledges: false,
    platformPercent: 10,
  },
} satisfies Meta<typeof WithForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllOrNothing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("−$800.00 platform fee")).toBeInTheDocument();
    await expect(
      canvas.getByText("−$232.30 Stripe fees (est.)")
    ).toBeInTheDocument();
    await expect(canvas.getByText("≈$6,967.70 after fees")).toBeInTheDocument();
    await expect(
      canvas.getByLabelText("Is it all or nothing?")
    ).not.toBeDisabled();
  },
};

export const NotAllOrNothing: Story = {
  args: { fundraiser: { ...VAN, isAllOrNothing: false } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByLabelText("Is it all or nothing?")
    ).not.toBeChecked();
  },
};

/** Supporters have pledged, so the terms they pledged under are locked */
export const WithPledges: Story = {
  args: { fundraiser: VINYL, hasPledges: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Is it all or nothing?")).toBeDisabled();
  },
};
