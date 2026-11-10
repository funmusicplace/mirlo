import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { fundraiserToFormData } from "./fundraiserFormData";
import FundraiserFormFields from "./FundraiserFormFields";
import { VAN, VINYL } from "./fundraiserStoryFixtures";

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
    fundraiser: VAN,
    currency: "usd",
    isAllOrNothing: true,
    hasPledges: false,
  },
} satisfies Meta<typeof WithForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllOrNothing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Minimum pledge")).toBeInTheDocument();
    await expect(
      canvas.getByLabelText("Is it all or nothing?")
    ).not.toBeDisabled();
  },
};

/** No minimum pledge: contributions aren't pledges */
export const NotAllOrNothing: Story = {
  args: {
    fundraiser: { ...VAN, isAllOrNothing: false },
    isAllOrNothing: false,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByLabelText("Minimum pledge")
    ).not.toBeInTheDocument();
  },
};

/** Supporters have pledged, so the terms they pledged under are locked */
export const WithPledges: Story = {
  args: { fundraiser: VINYL, hasPledges: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Is it all or nothing?")).toBeDisabled();
    await expect(canvas.getByLabelText("Minimum pledge")).toHaveValue(25);
  },
};
