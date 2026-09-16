import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => vi.fn() }));

vi.mock("utils/useJobStatusCheck", () => ({
  default: () => ({ uploadJobs: [], setUploadJobs: vi.fn() }),
}));

import UploadGeneralImage from "./UploadGeneralImage";

// ---- fixtures ---------------------------------------------------------------

const makeImage = (overrides: object = {}) => ({
  id: "image-1",
  sizes: { 625: "https://cdn.example.com/tier-header-x625.webp" },
  ...overrides,
});

// ---- helpers ----------------------------------------------------------------

const Wrapper: React.FC<{ image?: ReturnType<typeof makeImage> }> = ({
  image,
}) => {
  const methods = useForm();
  return (
    <MemoryRouter>
      <FormProvider {...methods}>
        <UploadGeneralImage
          artistId={1}
          image={image}
          height="200px"
          width="100%"
          size={625}
          maxDimensions="700x400"
          maxSize="15mb"
          imageTypeDescription="a header image"
          imageAlt="Tier header"
        />
      </FormProvider>
    </MemoryRouter>
  );
};

// ---- tests ------------------------------------------------------------------

// See #1919: the reported symptom ("header image doesn't load on first
// load") could not be reproduced through the actual subscription tier page
// (see tiers/{tierId}/Index.test.tsx) — its isLoading gate always mounts this
// component fresh, once, with the image already resolved. These tests pin
// down that baseline, prop-driven behavior for the component itself.
describe("UploadGeneralImage", () => {
  it("shows the existing image when it's already available on mount", () => {
    render(<Wrapper image={makeImage()} />);

    const img = screen.getByAltText("Tier header") as HTMLImageElement;
    expect(img.src).toContain("tier-header-x625.webp");
  });

  it("shows the upload prompt instead when there's no existing image", () => {
    render(<Wrapper image={undefined} />);

    expect(screen.queryByAltText("Tier header")).not.toBeInTheDocument();
  });
});
