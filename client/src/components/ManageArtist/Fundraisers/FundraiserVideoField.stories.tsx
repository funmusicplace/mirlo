import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { fundraiserToFormData } from "./fundraiserFormData";
import { VAN, FUNDRAISER_VIDEO } from "./fundraiserStoryFixtures";
import FundraiserVideoField from "./FundraiserVideoField";

const WithForm: React.FC<{ fundraiser: FundraiserSummary }> = ({
  fundraiser,
}) => {
  const methods = useForm({ defaultValues: fundraiserToFormData(fundraiser) });
  return (
    <FormProvider {...methods}>
      <form>
        <FundraiserVideoField videoEmbedUrl={fundraiser.videoEmbedUrl} />
      </form>
    </FormProvider>
  );
};

/**
 * The splash video on the fundraiser edit page. The artist pastes a YouTube
 * or Vimeo link; once saved, a preview shows under the field.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserVideoField",
  component: WithForm,
  parameters: { layout: "padded" },
  args: { fundraiser: { ...VAN, videoUrl: null, videoEmbedUrl: null } },
} satisfies Meta<typeof WithForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoVideo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Video")).toHaveValue("");
    await expect(
      canvas.queryByTitle("Fundraiser video")
    ).not.toBeInTheDocument();
  },
};

/** Shows the link as the artist pasted it, with the saved video under it */
export const WithVideo: Story = {
  args: { fundraiser: { ...VAN, ...FUNDRAISER_VIDEO } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Video")).toHaveValue(
      FUNDRAISER_VIDEO.videoUrl
    );
    await expect(canvas.getByTitle("Fundraiser video")).toBeInTheDocument();
  },
};
