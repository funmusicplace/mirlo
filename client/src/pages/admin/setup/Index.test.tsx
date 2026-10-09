import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { wasSetupGuideSeen } from "components/Setup/guide/setupGuideSeen";
import * as fetchWrapper from "queries/fetch/fetchWrapper";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.current ? `${key} ${opts.current}/${opts.total}` : key,
    i18n: { language: "en" },
  }),
  Trans: ({
    i18nKey,
    components = {},
  }: {
    i18nKey: string;
    components?: Record<string, React.ReactElement>;
  }) => (
    <>
      {i18nKey}
      {Object.entries(components).map(([name, element]) =>
        React.cloneElement(element, { key: name }, name)
      )}
    </>
  ),
}));

vi.mock("services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("queries/settings", () => ({
  queryFeaturedArtists: () => ({
    queryKey: ["fetchFeaturedArtists"],
    queryFn: () => Promise.resolve([]),
  }),
}));

vi.mock("queries/fetch/fetchWrapper", async (importOriginal) => ({
  ...(await importOriginal<typeof import("queries/fetch/fetchWrapper")>()),
  post: vi.fn(),
}));

const snackbar = vi.fn();
vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => snackbar,
}));

import SetupGuide from "./Index";

const storedSettings = (overrides: object = {}) => ({
  result: {
    isClosedToPublicArtistSignup: false,
    showQueueDashboard: false,
    terms: "",
    contentPolicy: "",
    settings: {
      platformPercent: 7,
      instanceCustomization: { title: "Nightjar" },
      emailProvider: {},
    },
    bucketNames: null,
    defconLevel: 0,
    ...overrides,
  },
});

function renderGuide() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/setup"]}>
        <Routes>
          <Route path="/admin/setup" element={<SetupGuide />} />
          <Route path="/admin/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const startGuide = async () => {
  await screen.findByText("welcome.title");
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  await userEvent.click(screen.getByRole("button", { name: "start" }));
};

describe("SetupGuide", () => {
  beforeEach(() => {
    localStorage.clear();
    snackbar.mockClear();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue(storedSettings() as any);
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockImplementation(async (_endpoint, body) => ({
      result: body,
    }));
    vi.mocked(fetchWrapper.post).mockReset();
    vi.mocked(fetchWrapper.post).mockResolvedValue({ result: {} });
  });

  test("does not dismiss the guide just by showing it", async () => {
    renderGuide();

    await screen.findByText("welcome.title");
    expect(wasSetupGuideSeen()).toBe(false);
  });

  test("derives the step states from the stored settings", async () => {
    vi.mocked(api.get).mockResolvedValue(
      storedSettings({
        terms: "Some terms",
        settings: {
          platformPercent: 7,
          instanceCustomization: { title: "Nightjar" },
          emailProvider: { provider: "smtp" },
        },
      }) as any
    );
    renderGuide();

    const nav = await screen.findByRole("navigation", {
      name: "guideNavLabel",
    });
    await waitFor(() =>
      expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(3)
    );
  });

  test("saves a step and moves to the next one", async () => {
    renderGuide();
    await startGuide();

    expect(screen.getByText("identity.description")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            instanceCustomization: expect.objectContaining({
              title: "Nightjar",
            }),
          }),
        })
      );
    });
    expect(await screen.findByText("email.description")).toBeInTheDocument();
  });

  test("leaves a step to do when it is saved with nothing filled in", async () => {
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("email.description")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    expect(
      await screen.findByText("platformPolicy.description")
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(1);
    expect(nav).not.toHaveTextContent("stepSkipped");
  });

  test("moves the focus to the title of the new step", async () => {
    renderGuide();
    await startGuide();

    expect(
      screen.getByRole("heading", { name: "steps.identity" })
    ).toHaveFocus();
  });

  test("skips a step without saving", async () => {
    vi.mocked(api.get).mockResolvedValue(
      storedSettings({
        settings: { platformPercent: 7, instanceCustomization: {} },
      }) as any
    );
    renderGuide();
    await startGuide();

    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("email.description")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    expect(nav).toHaveTextContent("stepSkipped");
  });

  test("drops what was typed in a step when it is skipped", async () => {
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    await userEvent.selectOptions(
      screen.getByLabelText("emailProviderLabel"),
      "smtp"
    );
    await userEvent.type(
      screen.getByLabelText("emailFrom"),
      "hello@nightjar.test"
    );
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("platformPolicy.description")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const body = vi.mocked(api.post).mock.calls[0][1] as {
      settings: { emailProvider: { provider?: string; fromEmail?: string } };
    };
    expect(body.settings.emailProvider.provider).toBeFalsy();
    expect(body.settings.emailProvider.fromEmail).toBeFalsy();
  });

  test("keeps the saved values when a step is skipped after a save", async () => {
    renderGuide();
    await startGuide();

    const nameInput = screen.getByLabelText("instanceName");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nightjar Records");
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );
    expect(await screen.findByText("email.description")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "back" }));
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.post).mock.calls[1][1]).toMatchObject({
      settings: { instanceCustomization: { title: "Nightjar Records" } },
    });
  });

  test("does not link out of the guide from the platform policy step", async () => {
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("platformPolicy.description")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("refuses to save the identity step without a name", async () => {
    renderGuide();
    await startGuide();

    await userEvent.clear(screen.getByLabelText("instanceName"));
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    expect(await screen.findByText("instanceNameRequired")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText("identity.description")).toBeInTheDocument();
  });

  test("keeps a done step done when it is skipped", async () => {
    renderGuide();
    await startGuide();

    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    expect(nav).not.toHaveTextContent("stepSkipped");
    expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(1);
  });

  test("warns and stays when saving fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Network error"));
    renderGuide();
    await startGuide();

    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() =>
      expect(snackbar).toHaveBeenCalledWith("saveError", { type: "warning" })
    );
    expect(screen.getByText("identity.description")).toBeInTheDocument();
  });

  test("completes the setup from the last step", async () => {
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("done.title")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "goToDashboard" })
    );

    await waitFor(() => {
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        "v1/admin/setup/complete",
        undefined
      );
    });
    expect(await screen.findByText("dashboard")).toBeInTheDocument();
  });

  test("lets the admin finish later", async () => {
    renderGuide();
    await screen.findByText("welcome.title");

    await userEvent.click(screen.getByRole("button", { name: "finishLater" }));

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(wasSetupGuideSeen()).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });
});
