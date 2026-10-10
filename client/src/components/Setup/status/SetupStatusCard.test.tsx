import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SetupStatusCard from "./SetupStatusCard";
import {
  HEALTHY_SETUP_STATUS,
  TROUBLED_SETUP_STATUS,
} from "./setupStatusMocks";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.count !== undefined ? `${key} ${opts.count}` : key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SetupStatusCard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const mockStatus = (status: object) =>
  vi.mocked(api.get).mockResolvedValue({ result: status } as any);

describe("SetupStatusCard", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  test("disappears once every step is done and every check passes", async () => {
    mockStatus(HEALTHY_SETUP_STATUS);
    renderCard();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  test("keeps reminding after the guide while a step is left", async () => {
    mockStatus({
      ...HEALTHY_SETUP_STATUS,
      steps: { ...HEALTHY_SETUP_STATUS.steps, email: false },
    });
    renderCard();

    expect(await screen.findByText("title")).toBeInTheDocument();
    expect(screen.getByText("steps.email")).toBeInTheDocument();
  });

  test("lists the undone steps and the failing checks", async () => {
    mockStatus(TROUBLED_SETUP_STATUS);
    renderCard();

    expect(await screen.findByText("title")).toBeInTheDocument();
    expect(screen.getByText("itemsLeft 3")).toBeInTheDocument();
    expect(screen.getByText("steps.email")).toBeInTheDocument();
    expect(screen.getByText("steps.platformPolicy")).toBeInTheDocument();
    expect(screen.queryByText("steps.identity")).not.toBeInTheDocument();
    expect(screen.getByText("worker.label")).toBeInTheDocument();
    expect(screen.queryByText("database.label")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "resumeGuide" })).toHaveAttribute(
      "href",
      "/admin/setup"
    );
  });

  test("shows the progress without a problem list when every check passes", async () => {
    mockStatus({
      ...HEALTHY_SETUP_STATUS,
      steps: { ...HEALTHY_SETUP_STATUS.steps, platformPolicy: false },
    });
    renderCard();

    expect(await screen.findByText("title")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2"
    );
    expect(screen.getByText("steps.platformPolicy")).toBeInTheDocument();
    expect(screen.queryByText("worker.label")).not.toBeInTheDocument();
  });
});
