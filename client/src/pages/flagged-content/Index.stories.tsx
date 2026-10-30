import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { AdminContentFlag } from "queries/admin";

import FlaggedContent from "./Index";

const ADMIN = { id: 1, name: "Admin", email: "admin@admin.example" };

const SPAM_MESSAGE =
  "Hi!! We LOVE your music and want to get it in front of 50,000 real listeners.\n\n" +
  "Our playlist promotion package guarantees streams on all major platforms. " +
  "Reply with your PayPal email and we'll send over the details today. " +
  "Limited spots available this week only!";

const makeFlag = (
  overrides: Partial<AdminContentFlag> = {}
): AdminContentFlag => ({
  id: 1,
  createdAt: "2026-10-28T09:12:00.000Z",
  source: "USER_REPORT",
  reason: "copyrightViolation",
  description: "This is a re-upload of an album I own the rights to.",
  reporterEmail: "listener@example.com",
  imageModel: null,
  imageId: null,
  externalId: null,
  score: null,
  artistId: 10,
  artist: {
    id: 10,
    name: "The Blue Herons",
    urlSlug: "the-blue-herons",
    enabled: true,
    user: {
      id: 20,
      name: "Herons Admin",
      email: "herons@example.com",
      disabledAt: null,
    },
  },
  trackGroupId: 30,
  trackGroup: {
    id: 30,
    title: "Night Swimming",
    urlSlug: "night-swimming",
    adminEnabled: true,
    hideFromSearch: false,
  },
  resolvedAt: null,
  resolvedByUserId: null,
  resolvedByUser: null,
  reportedUserId: null,
  reportedUser: null,
  trustLevelChange: null,
  spamStrikeNumber: null,
  ...overrides,
});

const FLAGS: AdminContentFlag[] = [
  makeFlag(),
  makeFlag({
    id: 2,
    createdAt: "2026-10-27T17:40:00.000Z",
    reason: "spamContactMessage",
    description: SPAM_MESSAGE,
    reporterEmail: "kestrel@example.com",
    artistId: null,
    artist: null,
    trackGroupId: null,
    trackGroup: null,
    reportedUserId: 40,
    reportedUser: {
      id: 40,
      name: "promo-blaster",
      email: "promo@spam.example",
      disabledAt: null,
    },
    trustLevelChange: {
      fromLevel: 1,
      toLevel: 0,
      createdAt: "2026-10-27T17:40:00.000Z",
    },
    spamStrikeNumber: 2,
  }),
  makeFlag({
    id: 3,
    createdAt: "2026-10-26T11:05:00.000Z",
    source: "SIGHTENGINE",
    reason: null,
    description: null,
    reporterEmail: null,
    imageModel: "trackGroupCover",
    imageId: "8c1f2e3d-4b5a-6978-8a9b-0c1d2e3f4a5b",
    externalId: "req_abc123",
    score: 0.94,
    artistId: 11,
    artist: {
      id: 11,
      name: "DJ Moth",
      urlSlug: "dj-moth",
      enabled: true,
      user: {
        id: 21,
        name: "Moth",
        email: "moth@example.com",
        disabledAt: null,
      },
    },
    trackGroupId: 31,
    trackGroup: {
      id: 31,
      title: "Porch Light",
      urlSlug: "porch-light",
      adminEnabled: true,
      hideFromSearch: true,
    },
  }),
  makeFlag({
    id: 4,
    createdAt: "2026-10-20T08:00:00.000Z",
    reason: "inappropriateContent",
    description: "The cover art is offensive.",
    artistId: 12,
    artist: {
      id: 12,
      name: "Sleepy Orchard",
      urlSlug: "sleepy-orchard",
      enabled: false,
      user: {
        id: 22,
        name: "Orchard",
        email: "orchard@example.com",
        disabledAt: "2026-10-21T08:00:00.000Z",
      },
    },
    trackGroupId: 32,
    trackGroup: {
      id: 32,
      title: "Windfall",
      urlSlug: "windfall",
      adminEnabled: false,
      hideFromSearch: false,
    },
    resolvedAt: "2026-10-21T08:00:00.000Z",
    resolvedByUserId: ADMIN.id,
    resolvedByUser: ADMIN,
  }),
];

const flagHandlers = (initial: AdminContentFlag[]) => {
  let flags = initial;

  const updateFlags = (
    match: (flag: AdminContentFlag) => boolean,
    update: (flag: AdminContentFlag) => Partial<AdminContentFlag>
  ) => {
    flags = flags.map((flag) =>
      match(flag) ? { ...flag, ...update(flag) } : flag
    );
  };

  return {
    reset: () => {
      flags = initial.map((flag) => ({ ...flag }));
    },
    handlers: [
      http.get("*/v1/admin/contentFlags", ({ request }) => {
        const resolved = new URL(request.url).searchParams.get("resolved");
        const results = flags.filter((flag) =>
          resolved === null
            ? true
            : (flag.resolvedAt !== null) === (resolved === "true")
        );
        return HttpResponse.json({ results, total: results.length });
      }),
      http.put("*/v1/admin/contentFlags/:id", async ({ params, request }) => {
        const { resolved } = (await request.json()) as { resolved: boolean };
        updateFlags(
          (flag) => flag.id === Number(params.id),
          () => ({
            resolvedAt: resolved ? new Date().toISOString() : null,
            resolvedByUserId: resolved ? ADMIN.id : null,
            resolvedByUser: resolved ? ADMIN : null,
          })
        );
        return HttpResponse.json({
          result: flags.find((flag) => flag.id === Number(params.id)),
        });
      }),
      http.put("*/v1/admin/trackGroups/:id", async ({ params, request }) => {
        const body = (await request.json()) as {
          adminEnabled: boolean;
          hideFromSearch: boolean;
        };
        updateFlags(
          (flag) => flag.trackGroup?.id === Number(params.id),
          (flag) => ({ trackGroup: { ...flag.trackGroup!, ...body } })
        );
        return HttpResponse.json({ message: "Success" });
      }),
      http.put("*/v1/admin/artists/:id", async ({ params, request }) => {
        const { enabled } = (await request.json()) as { enabled: boolean };
        updateFlags(
          (flag) => flag.artist?.id === Number(params.id),
          (flag) => ({ artist: { ...flag.artist!, enabled } })
        );
        return HttpResponse.json({ message: "Success" });
      }),
      http.put("*/v1/admin/users/:id", async ({ params, request }) => {
        const { disabled } = (await request.json()) as { disabled?: boolean };
        if (disabled !== undefined) {
          const disabledAt = disabled ? new Date().toISOString() : null;
          const id = Number(params.id);
          updateFlags(
            (flag) =>
              flag.reportedUser?.id === id || flag.artist?.user?.id === id,
            (flag) => ({
              reportedUser:
                flag.reportedUser?.id === id
                  ? { ...flag.reportedUser, disabledAt }
                  : flag.reportedUser,
              artist:
                flag.artist?.user?.id === id
                  ? {
                      ...flag.artist,
                      user: { ...flag.artist.user, disabledAt },
                    }
                  : flag.artist,
            })
          );
        }
        return HttpResponse.json({ message: "Success" });
      }),
    ],
  };
};

const flagStore = flagHandlers(FLAGS);

const meta = {
  title: "Features/Admin/FlaggedContent",
  component: FlaggedContent,
  loaders: [
    async () => {
      flagStore.reset();
      return {};
    },
  ],
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { contentFlags: flagStore.handlers } },
  },
} satisfies Meta<typeof FlaggedContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Night Swimming");
    await expect(canvas.getByText("promo-blaster")).toBeInTheDocument();
    await expect(canvas.getByText("Spam strike #2")).toBeInTheDocument();
    await expect(
      canvas.getByText("Trust level dropped from Verified to New")
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("trackGroupCover scored 0.94")
    ).toBeInTheDocument();
    await expect(canvas.queryByText("Windfall")).not.toBeInTheDocument();
  },
};

export const ShowResolved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Night Swimming");
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Status" }),
      "resolved"
    );
    await canvas.findByText("Windfall");
    await expect(canvas.getByText("Resolved by Admin")).toBeInTheDocument();
    await expect(canvas.queryByText("Night Swimming")).not.toBeInTheDocument();
  },
};

export const ReadFullSpamMessage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Read full message" })
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole("dialog", { name: "Spam contact message" })
    ).toBeInTheDocument();
  },
};

export const ResolveSpamReport: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("promo-blaster");
    const row = canvas.getByText("promo-blaster").closest("tr")!;
    await userEvent.click(
      within(row).getByRole("button", { name: "Mark as resolved" })
    );
    const dialog = within(
      await within(canvasElement.ownerDocument.body).findByRole("dialog", {
        name: "Resolve this report",
      })
    );
    await userEvent.click(
      dialog.getByRole("checkbox", {
        name: "Also reset the spam strikes of promo-blaster",
      })
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "Mark as resolved" })
    );
    await waitFor(() =>
      expect(canvas.queryByText("promo-blaster")).not.toBeInTheDocument()
    );
  },
};

export const DisableRelease: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Night Swimming");
    const [releaseStatus] = canvas.getAllByRole("combobox", {
      name: "Release status",
    });
    await userEvent.selectOptions(releaseStatus, "disabled");
    await waitFor(() => expect(releaseStatus).toHaveValue("disabled"));
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: {
        contentFlags: http.get("*/v1/admin/contentFlags", () =>
          HttpResponse.json({ results: [], total: 0 })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No flagged content.");
  },
};
