import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("state/UploadContext", () => ({
  useUpload: () => ({ imageQueue: [] }),
}));

vi.mock("utils/useShow", () => ({ default: () => "down" }));

vi.mock("utils/artist", () => ({
  isTrackGroupPublished: vi.fn(() => false),
  getReleaseUrl: vi.fn(() => "/test-artist/release/test-album"),
}));

vi.mock("pages/manage/artists/{artistId}/release/{trackGroupId}/Index", () => ({
  FormSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./SaveDraftBar", () => ({ default: () => null }));
vi.mock("components/ManageArtist/PublishButton", () => ({
  default: () => null,
}));
vi.mock("./VisibilityRadio", () => ({ default: () => null }));
vi.mock("./PreOrderSection", () => ({ default: () => null }));
vi.mock("./Pricing", () => ({ default: () => null }));
vi.mock("./SchedulePublication", () => ({ default: () => null }));
vi.mock("./FundraisingGoal", () => ({ default: () => null }));
vi.mock("./ManageTags", () => ({ default: () => null }));
vi.mock("../../UploadArtistImage", () => ({ default: () => null }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButtonLink: () => null,
}));
vi.mock("components/common/RestoredFields", () => ({
  RestoredLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

import AlbumFormContent from "./AlbumFormContent";

// ---- fixtures ---------------------------------------------------------------

const baseTrackGroup: TrackGroup = {
  id: 1,
  title: "Test Album",
  urlSlug: "test-album",
  artistId: 1,
  artist: { id: 1, urlSlug: "test-artist" } as Artist,
  tracks: [],
  tags: [],
  isPublic: false,
  publishedAt: null,
  releaseDate: null,
  fundraiser: null,
  scheduleEndOnReleaseDate: false,
} as unknown as TrackGroup;

function Wrapper({ urlSlug }: { urlSlug: string }) {
  const methods = useForm({ defaultValues: { ...baseTrackGroup, urlSlug } });
  return (
    <FormProvider {...methods}>
      <AlbumFormContent
        existingObject={{ ...baseTrackGroup, urlSlug }}
        reload={() => Promise.resolve()}
      />
    </FormProvider>
  );
}

// ---- tests ------------------------------------------------------------------

describe("AlbumFormContent", () => {
  describe("when urlSlug is a temporary slug", () => {
    test("does not render the slug input", () => {
      render(<Wrapper urlSlug="mi-temp-slug-new-album-abc123" />);
      expect(screen.queryByRole("textbox", { name: /urlSlug/i })).toBeNull();
    });
  });

  describe("when urlSlug is a real slug", () => {
    test("renders the slug input", () => {
      render(<Wrapper urlSlug="my-real-album" />);
      expect(
        screen.getByRole("textbox", { name: /urlSlug/i })
      ).toBeInTheDocument();
    });
  });
});
