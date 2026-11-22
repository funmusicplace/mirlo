import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { get, post } from "queries/fetch/fetchWrapper";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("queries/fetch/fetchWrapper", () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

const authState: { user: Partial<LoggedInUser> | null | undefined } = {
  user: undefined,
};
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

import AdminOnly from "./AdminOnly";

const status = (overrides: object) => ({
  result: {
    verified: false,
    verifiedUntil: null,
    hasFactors: false,
    totpEnabled: false,
    recoveryCodesRemaining: 0,
    securityKeys: [],
    ...overrides,
  },
});

function renderAdminOnly() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminOnly>
        <p>admin tools</p>
      </AdminOnly>
    </QueryClientProvider>
  );
}

describe("AdminOnly", () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
    vi.mocked(post).mockReset();
  });

  test("shows the admin tools once the session is verified", () => {
    authState.user = { isAdmin: true };
    renderAdminOnly();

    expect(screen.getByText("admin tools")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  test("asks an admin without a second factor to set one up", async () => {
    authState.user = { isAdmin: false, needsAdminVerification: true };
    vi.mocked(get).mockResolvedValue(status({}));
    renderAdminOnly();

    expect(await screen.findByText("gateIntroSetup")).toBeInTheDocument();
    expect(screen.getByText("addSecurityKey")).toBeInTheDocument();
    expect(screen.getByText("useAuthenticatorApp")).toBeInTheDocument();
    expect(screen.queryByText("verifyWithSecurityKey")).not.toBeInTheDocument();
    expect(screen.queryByText("admin tools")).not.toBeInTheDocument();
  });

  test("asks an admin with factors to verify with one of them", async () => {
    authState.user = { isAdmin: false, needsAdminVerification: true };
    vi.mocked(get).mockResolvedValue(
      status({
        hasFactors: true,
        totpEnabled: true,
        recoveryCodesRemaining: 10,
        securityKeys: [
          {
            id: "key-1",
            name: "YubiKey",
            createdAt: "2026-11-01T00:00:00.000Z",
            lastUsedAt: null,
          },
        ],
      })
    );
    vi.mocked(post).mockResolvedValue({ result: { verified: true } });
    renderAdminOnly();

    expect(await screen.findByText("gateIntroVerify")).toBeInTheDocument();
    expect(screen.getByText("verifyWithSecurityKey")).toBeInTheDocument();
    expect(screen.queryByText("addSecurityKey")).not.toBeInTheDocument();
    expect(screen.queryByText("admin tools")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("authenticatorCode"), "123456");
    await userEvent.click(screen.getByText("verifyCode"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("auth/mfa/totp/verify", {
        code: "123456",
      })
    );
  });

  test("hides the security key button when only an authenticator is set up", async () => {
    authState.user = { isAdmin: false, needsAdminVerification: true };
    vi.mocked(get).mockResolvedValue(
      status({ hasFactors: true, totpEnabled: true })
    );
    renderAdminOnly();

    expect(await screen.findByText("gateIntroVerify")).toBeInTheDocument();
    expect(screen.queryByText("verifyWithSecurityKey")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("useRecoveryCode"));
    expect(screen.getByLabelText("recoveryCode")).toBeInTheDocument();
  });
});
