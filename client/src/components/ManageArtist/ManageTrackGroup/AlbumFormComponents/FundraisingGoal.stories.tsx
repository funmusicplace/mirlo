import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { TRACK_GROUP_EXAMPLE } from "../../../../../test/mocks";

import FundraisingGoal from "./FundraisingGoal";

type Fundraiser = NonNullable<
  React.ComponentProps<typeof FundraisingGoal>["fundraiser"]
>;

const FUNDRAISER: Fundraiser = {
  id: 1,
  name: "Help us press vinyl",
  description: "Pledges are only charged if we reach the goal.",
  goalAmount: 50000, // cents
  isAllOrNothing: true,
  status: "ACTIVE",
};

/** Mocks the pledge totals the section reads from the supporters endpoint */
const supportersHandler = (totalPledges: number, totalAmount: number) =>
  http.get("*/v1/trackGroups/:trackGroupId/supporters/", () =>
    HttpResponse.json({
      results: [],
      total: totalPledges,
      totalAmount,
      totalSupporters: totalPledges,
      totalPledges,
    })
  );

const handlers = (totalPledges: number, totalAmount: number) => ({
  fundraiser: [
    http.get("*/v1/manage/trackGroups/:trackGroupId", () =>
      HttpResponse.json({ result: TRACK_GROUP_EXAMPLE })
    ),
    supportersHandler(totalPledges, totalAmount),
  ],
});

/** Seeds the form the same way AlbumForm does: goal in dollars, not cents */
const WithAlbumForm: React.FC<{ fundraiser?: Fundraiser }> = ({
  fundraiser,
}) => {
  const methods = useForm<TrackGroupFormData>({
    defaultValues: {
      goalAmount: fundraiser ? `${fundraiser.goalAmount / 100}` : "",
      isAllOrNothing: fundraiser?.isAllOrNothing ?? false,
      fundraiserName: fundraiser?.name ?? "",
      fundraiserDescription: fundraiser?.description ?? "",
    },
  });

  return (
    <FormProvider {...methods}>
      <FundraisingGoal
        trackGroupId={TRACK_GROUP_EXAMPLE.id}
        fundraiser={fundraiser}
      />
    </FormProvider>
  );
};

/**
 * The fundraiser section of the release form. Artists add a fundraiser,
 * set a goal, and charge pledges once an all-or-nothing goal is met. The
 * all-or-nothing setting locks once supporters have pledged.
 */
const meta = {
  title: "ManageArtist/ManageTrackGroup/FundraisingGoal",
  component: WithAlbumForm,
  parameters: {
    layout: "padded",
    msw: { handlers: handlers(0, 0) },
  },
  args: { fundraiser: FUNDRAISER },
} satisfies Meta<typeof WithAlbumForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFundraiser: Story = {
  args: { fundraiser: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Add a fundraiser to this release" })
    ).toBeInTheDocument();
  },
};

export const NoPledgesYet: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Remove fundraiser" });
    await expect(
      canvas.getByLabelText("Is it all or nothing?")
    ).not.toBeDisabled();
    await expect(
      canvas.queryByRole("button", { name: "Charge pledges now" })
    ).not.toBeInTheDocument();
  },
};

/** $50 pledged toward a $500 goal: pledges can't be charged yet */
export const BelowGoal: Story = {
  parameters: { msw: { handlers: handlers(3, 5000) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Cancel fundraiser" });
    await expect(
      canvas.queryByRole("button", { name: "Charge pledges now" })
    ).not.toBeInTheDocument();
    await expect(canvas.getByLabelText("Is it all or nothing?")).toBeDisabled();
    await expect(
      canvas.getByText(/can't be changed once supporters have pledged/)
    ).toBeInTheDocument();
  },
};

/** $600 pledged toward a $500 goal */
export const GoalReached: Story = {
  parameters: { msw: { handlers: handlers(12, 60000) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Charge pledges now" });
    await expect(canvas.getByLabelText("Is it all or nothing?")).toBeDisabled();
  },
};

export const NotAllOrNothing: Story = {
  args: { fundraiser: { ...FUNDRAISER, isAllOrNothing: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Mark fundraiser as done" })
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: "View pledges" })
    ).not.toBeInTheDocument();
  },
};

export const Complete: Story = {
  args: { fundraiser: { ...FUNDRAISER, status: "SUCCESSFUL" } },
  parameters: { msw: { handlers: handlers(12, 60000) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Fundraiser complete/);
    await expect(
      canvas.queryByRole("button", { name: "Charge pledges now" })
    ).not.toBeInTheDocument();
  },
};
