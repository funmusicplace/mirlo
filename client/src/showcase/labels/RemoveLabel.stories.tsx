import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import CustomizeArtistPage from "pages/manage/artists/{artistId}/customize/Index";
import type { LabelRemovalImpact } from "queries";

import { artistHandlers } from "../../../.storybook/handlers";
import { SHOWCASE_LABEL } from "../money/moneyFixtures";
import { manageArtistPage, layoutHandlers } from "../shared/AppFrame";
import { RELEASES, SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import { pause, recordingViewport, scrollToElement } from "../shared/helpers";

const PENDING_LABEL: ArtistLabel = {
  ...SHOWCASE_LABEL,
  labelUserId: 32,
  labelUser: {
    ...SHOWCASE_LABEL.labelUser,
    id: 32,
    name: "Tidepool Collective",
    email: "hi@tidepool.example",
  },
  isArtistApproved: false,
  canLabelManageArtist: false,
  canLabelAddReleases: false,
};

const ARTIST: Artist = {
  ...SHOWCASE_ARTIST_WITH_RELEASES,
  artistLabels: [SHOWCASE_LABEL, PENDING_LABEL],
  paymentToUserId: undefined,
};

const RELEASES_PAY_LABEL: LabelRemovalImpact = {
  trackGroups: [RELEASES.moss, RELEASES.dusk].map(({ id, title }) => ({
    id,
    title: title ?? "",
  })),
  isArtistPayee: false,
  activeSubscriptionCount: 0,
  newPayeeName: SHOWCASE_ARTIST_WITH_RELEASES.name,
};

let serverLabels: ArtistLabel[] = [];
let impact: LabelRemovalImpact = RELEASES_PAY_LABEL;

const handlers = [
  http.get("*/v1/manage/artists/:artistId/labels", () =>
    HttpResponse.json({ results: serverLabels })
  ),
  http.get("*/v1/manage/artists/:artistId/labels/:labelUserId", () =>
    HttpResponse.json({ result: impact })
  ),
  http.put(
    "*/v1/manage/artists/:artistId/labels/:labelUserId",
    ({ params }) => {
      serverLabels = serverLabels.map((l) =>
        l.labelUserId === Number(params.labelUserId)
          ? { ...l, isArtistApproved: true }
          : l
      );
      return HttpResponse.json({ results: serverLabels });
    }
  ),
  http.delete(
    "*/v1/manage/artists/:artistId/labels/:labelUserId",
    ({ params }) => {
      serverLabels = serverLabels.filter(
        (l) => l.labelUserId !== Number(params.labelUserId)
      );
      return HttpResponse.json({ results: serverLabels });
    }
  ),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
];

/**
 * An artist removes a label from their Customize page. Before confirming,
 * they see which releases pay the label today, who they'll pay instead, and
 * how many subscriptions stay billed through the label.
 */
const meta = {
  title: "Showcase/Labels/Remove a label",
  component: CustomizeArtistPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        receiver: handlers,
        artist: artistHandlers(() => ARTIST),
        layout: layoutHandlers,
      },
    },
    reactRouter: manageArtistPage("customize"),
  },
  beforeEach: () => {
    serverLabels = [SHOWCASE_LABEL, PENDING_LABEL];
    impact = RELEASES_PAY_LABEL;
  },
} satisfies Meta<typeof CustomizeArtistPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const openRemoveModal = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const [button] = await canvas.findAllByRole(
    "button",
    { name: "Remove" },
    { timeout: 10000 }
  );
  await scrollToElement(button, 360);
  await pause(700);
  await userEvent.click(button);
  const body = within(canvasElement.ownerDocument.body);
  await body.findByText("Remove Driftwood Records?");
  await body.findByRole("button", { name: "Remove label" });
  return body;
};

/**
 * The labels table: Driftwood Records is confirmed, Tidepool Collective has
 * invited the artist and is waiting for them to accept.
 */
export const LabelsTable: Story = {
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole(
      "button",
      { name: "Accept" },
      { timeout: 10000 }
    );
    await scrollToElement(button, 360);
  },
};

/** Two releases pay the label; they'll pay the artist once it's removed. */
export const ReleasesPayTheLabel: Story = {
  play: async ({ canvasElement }) => {
    await openRemoveModal(canvasElement);
  },
};

/**
 * The label is the artist's payment receiver, so every release without its
 * own receiver pays the label too, and three subscriptions are billed
 * through the label's Stripe account.
 */
export const LabelIsTheArtistsReceiver: Story = {
  beforeEach: () => {
    impact = {
      trackGroups: Object.values(RELEASES).map(({ id, title }) => ({
        id,
        title: title ?? "",
      })),
      isArtistPayee: true,
      activeSubscriptionCount: 3,
      newPayeeName: SHOWCASE_ARTIST_WITH_RELEASES.name,
    };
  },
  play: async ({ canvasElement }) => {
    const body = await openRemoveModal(canvasElement);
    await body.findByText(/3 active subscriptions/);
  },
};

/** Nothing pays the label, so the modal says payments won't change. */
export const NothingPaysTheLabel: Story = {
  beforeEach: () => {
    impact = { ...RELEASES_PAY_LABEL, trackGroups: [] };
  },
  play: async ({ canvasElement }) => {
    const body = await openRemoveModal(canvasElement);
    await body.findByText(/release payments won't change/);
  },
};

/** Confirms the removal; the label leaves the table. */
export const ConfirmRemoval: Story = {
  play: async ({ canvasElement }) => {
    const body = await openRemoveModal(canvasElement);
    await pause(1200);
    await userEvent.click(body.getByRole("button", { name: "Remove label" }));
    await body.findByText("Driftwood Records removed");
  },
};
