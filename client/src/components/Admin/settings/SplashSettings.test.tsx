import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useUpload } from "state/UploadContext";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { FormSettings, SPLASH_IMAGE_JOB_KEY } from "./settingsForm";
import SplashSettings from "./SplashSettings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("queries/instanceSettings", () => ({
  useInstanceSettings: () => ({
    splashImage: { sizes: { "750": "https://cdn.test/saved-x750.webp" } },
  }),
}));

vi.mock("state/UploadContext", () => ({
  useUpload: vi.fn(),
}));

const renderSettings = () => {
  const Wrapper = () => {
    const methods = useForm<FormSettings>({
      defaultValues: { instanceCustomization: { showCustomSplash: true } },
    });
    return (
      <FormProvider {...methods}>
        <SplashSettings />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe("SplashSettings", () => {
  beforeEach(() => {
    vi.mocked(useUpload).mockReturnValue({ trackedImageJobs: [] } as any);
    URL.createObjectURL = vi.fn(() => "blob:new");
    URL.revokeObjectURL = vi.fn();
  });

  test("shows the saved splash image with its remove button", () => {
    const { container } = renderSettings();

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.test/saved-x750.webp"
    );
    expect(
      screen.getByRole("button", { name: "removeSplashImage" })
    ).toBeInTheDocument();
  });

  test("shows the image being processed and hides the remove button", () => {
    vi.mocked(useUpload).mockReturnValue({
      trackedImageJobs: [
        {
          key: SPLASH_IMAGE_JOB_KEY,
          jobId: "12",
          file: new File(["x"], "splash.png", { type: "image/png" }),
        },
      ],
    } as any);

    const { container } = renderSettings();

    expect(container.querySelector("img")).toHaveAttribute("src", "blob:new");
    expect(screen.getByText("splashImageProcessing")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "removeSplashImage" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "replaceSplashImage" })
    ).toBeInTheDocument();
  });
});
