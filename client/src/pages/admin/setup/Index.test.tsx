import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SAVED_STEP_KEYS,
  STEP_FIELDS,
} from "components/Setup/guide/guideSteps";
import { wasSetupGuideSeen } from "components/Setup/guide/setupGuideSeen";
import {
  HEALTHY_SETUP_STATUS,
  TROUBLED_SETUP_STATUS,
} from "components/Setup/status/setupStatusMocks";
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
  queryInstanceArtist: () => ({
    queryKey: ["fetchInstanceArtist"],
    queryFn: () => Promise.resolve(null),
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

const ask = vi.fn();
vi.mock("utils/useConfirm", () => ({
  useConfirm: () => ({ ask }),
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
      instanceCustomization: {
        title: "Nightjar",
        contactEmail: "hello@nightjar.test",
      },
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

const DEFAULT_SETUP_STATUS = {
  ...HEALTHY_SETUP_STATUS,
  steps: {
    identity: true,
    email: false,
    platformPolicy: false,
    payments: false,
    spamProtection: false,
  },
};

let setupStatus = DEFAULT_SETUP_STATUS;

const mockSettings = (settings: object) => {
  vi.mocked(api.get).mockImplementation((async (url: string) =>
    url.includes("setup/status") ? { result: setupStatus } : settings) as any);
};

const startGuide = async () => {
  await screen.findByText("welcome.title");
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  await userEvent.click(screen.getByRole("button", { name: "start" }));
  await screen.findByText("systemCheck.description");
  await userEvent.click(screen.getByRole("button", { name: "continue" }));
};

const skipSteps = async (count: number) => {
  for (let i = 0; i < count; i++) {
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));
  }
};

describe("SetupGuide", () => {
  beforeEach(() => {
    localStorage.clear();
    snackbar.mockClear();
    ask.mockReset();
    setupStatus = DEFAULT_SETUP_STATUS;
    vi.mocked(api.get).mockReset();
    mockSettings(storedSettings());
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

  test("derives the step states from the server status", async () => {
    setupStatus = HEALTHY_SETUP_STATUS;
    renderGuide();

    const nav = await screen.findByRole("navigation", {
      name: "guideNavLabel",
    });
    await waitFor(() =>
      expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(6)
    );
  });

  test("shows the server checks and reruns them on demand", async () => {
    renderGuide();
    await screen.findByText("welcome.title");
    await userEvent.click(screen.getByRole("button", { name: "start" }));

    expect(await screen.findByText("database.label")).toBeInTheDocument();
    const statusCalls = () =>
      vi
        .mocked(api.get)
        .mock.calls.filter(([url]) => String(url).includes("setup/status"))
        .length;
    const before = statusCalls();
    await userEvent.click(
      screen.getByRole("button", { name: "systemCheck.rerun" })
    );
    await waitFor(() => expect(statusCalls()).toBe(before + 1));
  });

  test("says so when the checks cannot run", async () => {
    vi.mocked(api.get).mockImplementation((async (url: string) => {
      if (url.includes("setup/status")) {
        throw new Error("Network error");
      }
      return storedSettings();
    }) as any);
    renderGuide();
    await screen.findByText("welcome.title");
    await userEvent.click(screen.getByRole("button", { name: "start" }));

    expect(await screen.findByText("systemCheck.error")).toBeInTheDocument();
    expect(screen.queryByText("systemCheck.loading")).not.toBeInTheDocument();
  });

  test("does not let a step be skipped before the settings are loaded", async () => {
    vi.mocked(api.get).mockImplementation((async (url: string) =>
      url.includes("setup/status")
        ? { result: setupStatus }
        : new Promise(() => {})) as any);
    renderGuide();
    await screen.findByText("welcome.title");
    await userEvent.click(screen.getByRole("button", { name: "start" }));
    await userEvent.click(screen.getByRole("button", { name: "continue" }));

    expect(screen.getByRole("button", { name: "skipForNow" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "saveAndContinue" })
    ).toBeDisabled();
  });

  test("does not count the system check as done while a check fails", async () => {
    setupStatus = TROUBLED_SETUP_STATUS;
    renderGuide();

    const nav = await screen.findByRole("navigation", {
      name: "guideNavLabel",
    });
    await screen.findByText("welcome.title");
    await waitFor(() => expect(api.get).toHaveBeenCalled());
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

  test("marks a step as to do again when it is saved empty", async () => {
    setupStatus = {
      ...DEFAULT_SETUP_STATUS,
      steps: { ...DEFAULT_SETUP_STATUS.steps, email: true },
    };
    mockSettings(
      storedSettings({
        settings: {
          platformPercent: 7,
          instanceCustomization: {
            title: "Nightjar",
            contactEmail: "hello@nightjar.test",
          },
          emailProvider: { provider: "smtp" },
        },
      })
    );
    vi.mocked(api.post).mockImplementation((async (
      _endpoint: string,
      body: object
    ) => {
      setupStatus = DEFAULT_SETUP_STATUS;
      return { result: body };
    }) as any);
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    await waitFor(() =>
      expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(3)
    );
    await userEvent.selectOptions(
      screen.getByLabelText("emailProviderLabel"),
      ""
    );
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() =>
      expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(2)
    );
  });

  test("leaves a step to do when it is saved with nothing filled in", async () => {
    renderGuide();
    await startGuide();
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("email.description")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    expect(await screen.findByText("payments.description")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(2);
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
    setupStatus = {
      ...DEFAULT_SETUP_STATUS,
      steps: { ...DEFAULT_SETUP_STATUS.steps, identity: false },
    };
    mockSettings(
      storedSettings({
        settings: { platformPercent: 7, instanceCustomization: {} },
      })
    );
    renderGuide();
    await startGuide();

    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("email.description")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    const nav = screen.getByRole("navigation", { name: "guideNavLabel" });
    expect(nav).toHaveTextContent("stepSkipped");
  });

  test("reports no unsaved changes after skipping every step", async () => {
    renderGuide();
    await startGuide();
    await skipSteps(SAVED_STEP_KEYS.length);

    expect(screen.getByText("done.description")).toBeInTheDocument();
    expect(screen.queryByText("unsavedChanges")).not.toBeInTheDocument();
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
    await userEvent.clear(screen.getByLabelText("contactEmail"));
    await userEvent.type(
      screen.getByLabelText("contactEmail"),
      "typed@nightjar.test"
    );
    await userEvent.click(screen.getByRole("button", { name: "skipForNow" }));

    expect(screen.getByText("payments.description")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const body = vi.mocked(api.post).mock.calls[0][1] as {
      settings: {
        emailProvider: { provider?: string; fromEmail?: string };
        instanceCustomization: { title?: string; contactEmail?: string };
      };
    };
    expect(body.settings.emailProvider.provider).toBeFalsy();
    expect(body.settings.emailProvider.fromEmail).toBeFalsy();
    expect(body.settings.instanceCustomization).toMatchObject({
      title: "Nightjar",
      contactEmail: "hello@nightjar.test",
    });
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
    await skipSteps(4);

    expect(screen.getByText("platformPolicy.description")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("saves a typed secret key before registering the payment webhook", async () => {
    renderGuide();
    await startGuide();
    await skipSteps(2);

    expect(screen.getByText("payments.description")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("stripeSecretKey"),
      "sk_test_new"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "stripeWebhookRegister" })
    );

    await waitFor(() =>
      expect(vi.mocked(api.post).mock.calls.map(([url]) => url)).toEqual([
        "admin/settings",
        "admin/stripeWebhook",
      ])
    );
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
      settings: { stripe: { key: "sk_test_new" } },
    });
    expect(screen.getByText("payments.description")).toBeInTheDocument();
  });

  test("warns when the payment keys come from different modes", async () => {
    renderGuide();
    await startGuide();
    await skipSteps(2);

    await userEvent.type(
      screen.getByLabelText("stripeSecretKey"),
      "sk_live_new"
    );
    expect(screen.queryByText("stripeKeyModeMismatch")).not.toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("stripePublishableKey"),
      "pk_test_new"
    );

    expect(screen.getByText("stripeKeyModeMismatch")).toBeInTheDocument();
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
    expect(nav.querySelectorAll('[aria-label="stepDone"]')).toHaveLength(2);
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
    await skipSteps(5);

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

  test("saves only the fields of the current step and keeps the others as a draft", async () => {
    renderGuide();
    await startGuide();

    await userEvent.type(screen.getByLabelText("instanceName"), " Records");
    await userEvent.click(screen.getByRole("button", { name: "steps.email" }));
    await userEvent.click(
      screen.getByRole("button", { name: "saveAndContinue" })
    );

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
      settings: { instanceCustomization: { title: "Nightjar" } },
    });
    await userEvent.click(
      screen.getByRole("button", { name: /^steps\.identity/ })
    );
    expect(screen.getByLabelText("instanceName")).toHaveValue(
      "Nightjar Records"
    );
  });

  test("lists every field shown in a step among the fields that step saves", async () => {
    renderGuide();
    await startGuide();

    for (const key of SAVED_STEP_KEYS) {
      await userEvent.click(
        screen.getByRole("button", { name: new RegExp(`^steps\.${key}`) })
      );
      const step = await screen.findByRole("heading", {
        name: `steps.${key}`,
      });
      const names = Array.from(
        step
          .closest("section")!
          .querySelectorAll<HTMLInputElement>(
            "input[name], select[name], textarea[name]"
          )
      ).map((input) => input.name);

      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(
          STEP_FIELDS[key].some(
            (field) => name === field || name.startsWith(`${field}.`)
          ),
          `${name} is shown on the ${key} step but not saved by it`
        ).toBe(true);
      }
    }
  });

  test("does not report unsaved changes after visiting every step", async () => {
    renderGuide();
    await startGuide();

    for (const key of SAVED_STEP_KEYS) {
      await userEvent.click(
        screen.getByRole("button", { name: new RegExp(`^steps\.${key}`) })
      );
    }
    await userEvent.click(screen.getByRole("button", { name: "steps.done" }));

    expect(await screen.findByText("done.title")).toBeInTheDocument();
    expect(screen.queryByText("unsavedChanges")).not.toBeInTheDocument();
  });

  test("warns on the last step about changes that were not saved", async () => {
    renderGuide();
    await startGuide();

    await userEvent.type(screen.getByLabelText("instanceName"), " Records");
    await userEvent.click(screen.getByRole("button", { name: "steps.done" }));

    expect(await screen.findByText("unsavedChanges")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("asks before finishing later with changes that were not saved", async () => {
    ask.mockResolvedValueOnce(false);
    renderGuide();
    await startGuide();

    await userEvent.type(screen.getByLabelText("instanceName"), " Records");
    await userEvent.click(screen.getByRole("button", { name: "finishLater" }));

    await waitFor(() =>
      expect(ask).toHaveBeenCalledWith("unsavedChangesConfirm")
    );
    expect(screen.getByText("identity.description")).toBeInTheDocument();
    expect(wasSetupGuideSeen()).toBe(false);

    ask.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "finishLater" }));
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
