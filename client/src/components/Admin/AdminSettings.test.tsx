import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

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

import AdminSettings from "./AdminSettings";

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
        instanceArtistId: 1,
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
        s3: {
          keyId: "keyid123",
          applicationKey: "appkey123",
          keyName: "mykey",
          endpoint: "https://s3.example.com",
          region: "us-east-1",
        },
        cloudflareTurnstileSecret: "cf-secret",
      },
      ...overrides,
    },
  };
}

// ---- tests ------------------------------------------------------------------

describe("AdminSettings", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(makeSettings() as any);
    vi.mocked(api.post).mockResolvedValue({} as any);
    mockSnackbar.mockClear();
  });

  test("fetches settings on mount and populates the form", async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("admin/settings/");
    });

    expect(
      screen.getByDisplayValue("https://cdn.example.com")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  test("shows success snackbar after settings load", async () => {
    render(<AdminSettings />);

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

    render(<AdminSettings />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("sk_*** (leave blank to keep)")
      ).toBeInTheDocument();
    });
  });

  test("shows 'No key set' placeholder when stripe key is not configured", async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("No key set")).toBeInTheDocument();
    });
  });

  test("submits form with correct payload", async () => {
    render(<AdminSettings />);

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
            s3: expect.objectContaining({ keyId: "keyid123" }),
          }),
        })
      );
    });
  });

  test("shows success snackbar after successful save", async () => {
    render(<AdminSettings />);

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

    render(<AdminSettings />);

    await waitFor(() => screen.getByDisplayValue("10"));
    mockSnackbar.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockSnackbar).toHaveBeenCalledWith("Oops something went wrong", {
        type: "warning",
      });
    });
  });

  test("renders all section headings", async () => {
    render(<AdminSettings />);

    await waitFor(() => screen.getByDisplayValue("10"));

    expect(screen.getByText("General Settings")).toBeInTheDocument();
    expect(screen.getByText("Stripe Settings")).toBeInTheDocument();
    expect(screen.getByText("Email Provider Settings")).toBeInTheDocument();
    expect(screen.getByText("S3 Settings")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });
});
