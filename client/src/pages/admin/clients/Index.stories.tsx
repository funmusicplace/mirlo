import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import type { AdminClient } from "queries/admin";

import Clients from "./Index";

const makeClient = (overrides: Partial<AdminClient> = {}): AdminClient => ({
  id: 1,
  applicationName: "Radiccio",
  applicationUrl: "https://radiccio.app",
  allowedCorsOrigins: ["https://radiccio.app"],
  key: "3f9a1c7e-5b2d-4e8f-9a6c-1d2e3f4a5b6c",
  status: "approved",
  redirectUris: ["https://radiccio.app/callback"],
  confidential: false,
  fullCatalog: false,
  clientIdUrl: null,
  user: { id: 1, email: "dev@radiccio.app" },
  createdAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const CLIENTS: AdminClient[] = [
  makeClient(),
  makeClient({
    id: 2,
    applicationName: "Mirlo WordPress plugin",
    applicationUrl: "https://example-artist.com",
    allowedCorsOrigins: [],
    status: "pending",
    redirectUris: [],
    confidential: true,
    user: null,
  }),
  makeClient({
    id: 3,
    applicationName: "Metadata app",
    applicationUrl: "https://metadata.example",
    allowedCorsOrigins: [],
    key: null,
    status: "revoked",
    redirectUris: ["https://metadata.example/cb"],
    clientIdUrl: "https://metadata.example/client.json",
    user: null,
  }),
];

const clientHandlers = (initial: AdminClient[]) => {
  let clients = initial.map((c) => ({ ...c }));
  let nextId = Math.max(0, ...clients.map((c) => c.id)) + 1;
  return [
    http.get("*/v1/admin/clients", () =>
      HttpResponse.json({ results: clients, total: clients.length })
    ),
    http.post("*/v1/admin/clients", async ({ request }) => {
      const body = (await request.json()) as Partial<AdminClient>;
      const created = makeClient({
        ...body,
        id: nextId++,
        key: crypto.randomUUID(),
        status: "approved",
        user: null,
      });
      clients = [...clients, created];
      return HttpResponse.json({ result: created });
    }),
    http.put("*/v1/admin/clients/:id", async ({ params, request }) => {
      const { rotateKey, ...body } = (await request.json()) as Partial<
        AdminClient & { rotateKey: boolean }
      >;
      clients = clients.map((c) =>
        c.id === Number(params.id)
          ? {
              ...c,
              ...body,
              ...(rotateKey ? { key: crypto.randomUUID() } : {}),
            }
          : c
      );
      return HttpResponse.json({
        result: clients.find((c) => c.id === Number(params.id)),
      });
    }),
    http.delete("*/v1/admin/clients/:id", ({ params }) => {
      clients = clients.filter((c) => c.id !== Number(params.id));
      return HttpResponse.json({ message: "Success" });
    }),
  ];
};

const meta = {
  title: "Admin/Clients",
  component: Clients,
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { clients: clientHandlers(CLIENTS) } },
  },
} satisfies Meta<typeof Clients>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByDisplayValue("Radiccio");
    await expect(
      canvas.getAllByRole("button", { name: "Rotate key" })
    ).toHaveLength(3);
  },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: { clients: clientHandlers([]) } },
  },
};

export const SaveRedirectUris: Story = {
  parameters: {
    msw: { handlers: { clients: clientHandlers(CLIENTS) } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByDisplayValue("Radiccio");
    const [input] = canvas.getAllByRole("textbox", {
      name: /redirect URIs/,
    });
    const save = within(input.closest("form")!).getByRole("button", {
      name: "Save",
    });
    await expect(save).toBeDisabled();
    await userEvent.type(input, ", https://radiccio.app/other");
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
  },
};
