import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { FormProvider, useForm } from "react-hook-form";

import { ARTIST, VAN } from "./fundraiserStoryFixtures";
import FundraiserUrlField from "./FundraiserUrlField";

/**
 * The line under the fundraiser's name on its edit page. "Change URL" shows
 * an input; the new URL is saved with the rest of the form.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserUrlField",
  component: FundraiserUrlField,
  decorators: [
    (Story) => {
      const methods = useForm({ defaultValues: { urlSlug: "a-van" } });
      return (
        <FormProvider {...methods}>
          <Story />
        </FormProvider>
      );
    },
  ],
  parameters: { layout: "padded" },
  args: {
    artist: ARTIST,
    fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: false },
  },
} satisfies Meta<typeof FundraiserUrlField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChangeUrl: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change URL" }));
    const input = canvas.getByLabelText("Fundraiser URL");
    await userEvent.clear(input);
    await userEvent.type(input, "our-van");
    await expect(
      canvas.getByText(/\/tidal-hours\/fundraiser\/our-van/)
    ).toBeInTheDocument();
  },
};

/** Public: changing the URL breaks links people may have shared */
export const Public: Story = {
  args: { fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change URL" }));
    await expect(
      canvas.getByText(/will break existing links/)
    ).toBeInTheDocument();
  },
};
