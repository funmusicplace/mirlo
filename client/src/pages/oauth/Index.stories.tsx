import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { OAuthApproval, OAuthInteraction } from "queries/oauth";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { USER_EXAMPLE } from "../../../test/mocks";

import OAuth from "./Index";

const UID = "f3Vq1x";

const LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#7c3aed"/><text x="24" y="32" font-size="24" text-anchor="middle" fill="white" font-family="sans-serif">R</text></svg>'
  );

const interaction = (
  overrides: Partial<OAuthInteraction> = {}
): OAuthInteraction => ({
  client: {
    name: "Radiccio",
    uri: "https://radiccio.app",
    logoUri: LOGO,
    domain: "radiccio.app",
  },
  approval: "approved",
  redirectHost: "radiccio.app",
  scopes: ["openid", "profile", "email"],
  loggedIn: true,
  needsConsent: true,
  ...overrides,
});

const handlers = (details: OAuthInteraction | null) => {
  let approval: OAuthApproval | undefined = details?.approval;
  return {
    auth: [
      http.get("*/auth/profile", () =>
        details?.loggedIn
          ? HttpResponse.json({ result: USER_EXAMPLE })
          : HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      ),
      http.post("*/auth/refresh", () => HttpResponse.json({})),
    ],
    oauth: [
      http.get("*/oauth/:uid/details", () =>
        details
          ? HttpResponse.json({ result: { ...details, approval } })
          : HttpResponse.json(
              { error: "This sign-in request has expired" },
              { status: 404 }
            )
      ),
      http.post("*/oauth/:uid/decision", async ({ request }) => {
        const { action } = (await request.json()) as { action: string };
        if (action === "requestApproval") {
          approval = "pending";
          return HttpResponse.json({ result: { approval } });
        }
        return new Promise<never>(() => {});
      }),
    ],
  };
};

const meta = {
  title: "OAuth/Connect an app",
  component: OAuth,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: handlers(interaction()) },
    reactRouter: reactRouterParameters({
      location: { pathParams: { uid: UID } },
      routing: { path: "/oauth/:uid" },
    }),
  },
} satisfies Meta<typeof OAuth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Consent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Radiccio wants to connect to your account");
    await expect(canvas.getByText("See your email address")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Allow" })).toBeEnabled();
  },
};

export const FullAccountAccess: Story = {
  parameters: {
    msw: {
      handlers: handlers(
        interaction({ scopes: ["openid", "api", "offline_access"] })
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Act as you on this site.");
    await expect(
      canvas.getByText("Stay connected until you disconnect it")
    ).toBeVisible();
  },
};

export const SubscriberSync: Story = {
  parameters: {
    msw: {
      handlers: handlers(
        interaction({
          client: {
            name: "Nightjar Records website",
            uri: "https://nightjar.example",
            logoUri: null,
            domain: "nightjar.example",
          },
          redirectHost: "nightjar.example",
          scopes: ["openid", "subscribers:read", "offline_access"],
        })
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "See the names and email addresses of the supporters of the artists you manage"
    );
  },
};

export const Allowing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Allow" }));
    await expect(canvas.getByRole("button", { name: "Deny" })).toBeDisabled();
  },
};

export const NotApproved: Story = {
  parameters: {
    msw: { handlers: handlers(interaction({ approval: "unknown" })) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: "Ask the admins to approve it",
      })
    );
    await canvas.findByText(
      "The admins have been asked to approve this app. Try again once they have."
    );
    await expect(
      canvas.queryByRole("button", { name: "Ask the admins to approve it" })
    ).toBeNull();
  },
};

export const WaitingForApproval: Story = {
  parameters: {
    msw: { handlers: handlers(interaction({ approval: "pending" })) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Back to Radiccio" });
  },
};

export const Expired: Story = {
  parameters: { msw: { handlers: handlers(null) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "This sign-in request has expired. Go back to the app and try again."
    );
  },
};
