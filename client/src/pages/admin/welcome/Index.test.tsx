import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { queryInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "services/api";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
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

const STORED_SETTINGS = {
  result: {
    isClosedToPublicArtistSignup: false,
    showQueueDashboard: false,
    terms: "Terms text",
    settings: {
      platformPercent: 10,
      instanceCustomization: { artistId: "7" },
    },
    bucketNames: null,
    defconLevel: 0,
  },
};

const lastSavedCustomization = () =>
  (vi.mocked(api.post).mock.calls[0][1] as { settings: SettingsPayload })
    .settings.instanceCustomization;

type SettingsPayload = { instanceCustomization: Record<string, unknown> };

const authState: { user: Partial<LoggedInUser> | null | undefined } = {
  user: undefined,
};
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

import Welcome from "./Index";

const assign = vi.fn();

function renderWelcome(setupStage: InstanceSettings["setupStage"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(queryInstanceSettings().queryKey, {
    ...DEFAULT_INSTANCE_SETTINGS,
    setupStage,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/welcome"]}>
        <Routes>
          <Route path="/admin/welcome" element={<Welcome />} />
          <Route path="/" element={<p>home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const clickOpenMyPlatform = async () => {
  const button = screen.getByRole("button", { name: "openMyPlatform" });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
};

const fillFirstTwoSteps = async (email?: string) => {
  await userEvent.type(screen.getByLabelText("nameLabel"), "Nightjar");
  await userEvent.click(screen.getByRole("button", { name: "continue" }));
  if (email) {
    await userEvent.type(screen.getByLabelText("contactLabel"), email);
  }
  await userEvent.click(screen.getByRole("button", { name: "continue" }));
};

describe("Welcome", () => {
  beforeEach(() => {
    authState.user = { id: 1, isAdmin: true };
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue(STORED_SETTINGS as any);
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValue({} as any);
    assign.mockClear();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });
  });

  test("asks to log in when nobody is logged in", async () => {
    authState.user = null;
    renderWelcome("welcome");

    expect(screen.getByText("loginLead")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("loginEmail"),
      "admin@example.com"
    );
    await userEvent.type(screen.getByLabelText("loginPassword"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "logIn" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("auth/login"),
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(screen.queryByText("nameLead")).not.toBeInTheDocument();
  });

  test("tells a logged in listener that the platform is being set up", () => {
    authState.user = { id: 2, isAdmin: false };
    renderWelcome("welcome");

    expect(screen.getByText("notAdminLead")).toBeInTheDocument();
    expect(screen.queryByText("nameLead")).not.toBeInTheDocument();
  });

  test("renders nothing while the login state is unknown", () => {
    authState.user = undefined;
    renderWelcome("welcome");

    expect(screen.queryByText("loginLead")).not.toBeInTheDocument();
    expect(screen.queryByText("nameLead")).not.toBeInTheDocument();
  });

  test("walks the admin through the three steps and saves the answers", async () => {
    renderWelcome("welcome");

    expect(screen.getByText("nameLead")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("nameLabel"), " Nightjar ");
    await userEvent.click(screen.getByRole("button", { name: "continue" }));

    expect(screen.getByText("contactLead")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("contactLabel"),
      "hello@nightjar.test"
    );
    await userEvent.click(screen.getByRole("button", { name: "continue" }));

    expect(screen.getByText("colorLead")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "colorYellow" }));
    await clickOpenMyPlatform();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({
          terms: "Terms text",
          settings: expect.objectContaining({ platformPercent: 10 }),
        })
      );
    });
    expect(lastSavedCustomization()).toEqual({
      artistId: "7",
      title: "Nightjar",
      supportEmail: "hello@nightjar.test",
      colors: {
        button: "#eda100",
        buttonText: "#000000",
        background: "#ffffff",
        text: "#000000",
      },
    });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  test("leaves the contact email out when it is skipped", async () => {
    renderWelcome("welcome");

    await fillFirstTwoSteps();
    await clickOpenMyPlatform();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(lastSavedCustomization()).toEqual({
      artistId: "7",
      title: "Nightjar",
      colors: {
        button: "#be3455",
        buttonText: "#ffffff",
        background: "#ffffff",
        text: "#000000",
      },
    });
  });

  test("stays on the first step without a name", async () => {
    renderWelcome("welcome");

    await userEvent.type(screen.getByLabelText("nameLabel"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "continue" }));

    expect(screen.getByText("nameLead")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("comes back to a previous step with its answer kept", async () => {
    renderWelcome("welcome");

    await userEvent.type(screen.getByLabelText("nameLabel"), "Nightjar");
    await userEvent.click(screen.getByRole("button", { name: "continue" }));
    await userEvent.click(screen.getByRole("button", { name: "back" }));

    expect(screen.getByLabelText("nameLabel")).toHaveValue("Nightjar");
  });

  test("shows an error and stays when saving fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Network error"));
    renderWelcome("welcome");

    await fillFirstTwoSteps();
    await clickOpenMyPlatform();

    expect(await screen.findByRole("alert")).toHaveTextContent("saveError");
    expect(assign).not.toHaveBeenCalled();
  });

  test("leaves once the instance has a name", () => {
    renderWelcome("guide");

    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("nameLead")).not.toBeInTheDocument();
  });
});
