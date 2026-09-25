import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { level?: number }) =>
      opts?.level === undefined ? key : `${key} ${opts.level}`,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("queries/settings", () => ({
  queryFeaturedArtists: () => ({
    queryKey: ["fetchFeaturedArtists"],
    queryFn: () => Promise.resolve([]),
  }),
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

vi.mock("services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockSnackbar = vi.fn();
vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => mockSnackbar,
}));

import Settings from "./Index";

// ---- fixtures ---------------------------------------------------------------

function makeSettings(overrides: object = {}) {
  return {
    result: {
      isClosedToPublicArtistSignup: false,
      showQueueDashboard: false,
      cdnUrl: "https://cdn.example.com",
      terms: "Terms text",
      privacyPolicy: "Privacy text",
      cookiePolicy: "Cookie text",
      contentPolicy: "Content text",
      defconLevel: 0,
      settings: {
        platformPercent: 10,
        instanceCustomization: {
          colors: {
            button: "#be3455",
            buttonText: "#ffffff",
            background: "#ffffff",
            text: "#000000",
          },
        },
        stripe: {
          key: "",
          keyConfigured: false,
          webhookConnectSigningSecret: "",
        },
        emailProvider: {
          provider: "sendgrid" as const,
          fromEmail: "hello@example.com",
          sendgrid: { apiKey: "" },
          mailgun: { apiKey: "", domain: "" },
        },
        cloudflareTurnstileSecret: "cf-secret",
        trustLevelNames: ["Newcomer", "Member"],
      },
      bucketNames: null,
      ...overrides,
    },
  };
}

// ---- helpers ----------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderSettings() {
  return render(<Settings />, { wrapper: createWrapper() });
}

// ---- tests ------------------------------------------------------------------

describe("Settings", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(makeSettings() as any);
    vi.mocked(api.post).mockResolvedValue({} as any);
    mockSnackbar.mockClear();
  });

  test("fetches settings on mount and populates the form", async () => {
    renderSettings();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("admin/settings/");
    });

    expect(
      screen.getByDisplayValue("https://cdn.example.com")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  test("shows success snackbar after settings load", async () => {
    renderSettings();

    await waitFor(() => {
      expect(mockSnackbar).toHaveBeenCalledWith("Settings loaded", {
        type: "success",
      });
    });
  });

  test("shows placeholder when stripe key is already configured", async () => {
    vi.mocked(api.get).mockResolvedValue(
      makeSettings({
        settings: {
          ...makeSettings().result.settings,
          stripe: { key: "", keyConfigured: true },
        },
      }) as any
    );

    renderSettings();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("stripeKeyPlaceholderConfigured")
      ).toBeInTheDocument();
    });
  });

  test("shows 'No key set' placeholder when stripe key is not configured", async () => {
    renderSettings();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("stripeKeyPlaceholderEmpty")
      ).toBeInTheDocument();
    });
  });

  test("submits form with correct payload", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({
          cdnUrl: "https://cdn.example.com",
          terms: "Terms text",
          showQueueDashboard: false,
          isClosedToPublicArtistSignup: false,
          settings: expect.objectContaining({
            platformPercent: 10,
          }),
          bucketNames: null,
        })
      );
    });
  });

  test("preserves legacy (null) bucketNames when consolidated mode isn't enabled", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({ bucketNames: null })
      );
    });
  });

  test("sends a prefix when consolidated bucket mode is enabled", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    const consolidatedCheckbox = document.querySelector(
      'input[name="useConsolidatedBuckets"]'
    ) as HTMLInputElement;
    await userEvent.click(consolidatedCheckbox);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({ bucketNames: { prefix: "" } })
      );
    });
  });

  test("shows success snackbar after successful save", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));
    mockSnackbar.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockSnackbar).toHaveBeenCalledWith("Settings updated", {
        type: "success",
      });
    });
  });

  test("shows warning snackbar when save fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Network error"));

    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));
    mockSnackbar.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockSnackbar).toHaveBeenCalledWith("Oops something went wrong", {
        type: "warning",
      });
    });
  });

  test("fills trust level names with defaults when unset", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    expect(screen.getByLabelText("trustLevelName 0")).toHaveValue("Newcomer");
    expect(screen.getByLabelText("trustLevelName 1")).toHaveValue("Member");
    expect(screen.getByLabelText("trustLevelName 2")).toHaveValue("Regular");
    expect(screen.getByLabelText("trustLevelName 3")).toHaveValue("Trusted");
  });

  test("submits edited trust level names", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    const input = screen.getByLabelText("trustLevelName 3");
    await userEvent.clear(input);
    await userEvent.type(input, "Veteran");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "admin/settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            trustLevelNames: ["Newcomer", "Member", "Regular", "Veteran"],
          }),
        })
      );
    });
  });

  test("renders all section headings", async () => {
    renderSettings();

    await waitFor(() => screen.getByDisplayValue("10"));

    expect(screen.getByText("generalSettings")).toBeInTheDocument();
    expect(screen.getByText("stripeSettings")).toBeInTheDocument();
    expect(screen.getByText("emailProviderSettings")).toBeInTheDocument();
    expect(screen.getByText("storage")).toBeInTheDocument();
    expect(screen.getByText("trustLevels")).toBeInTheDocument();
    expect(screen.getByText("security")).toBeInTheDocument();
  });
});
