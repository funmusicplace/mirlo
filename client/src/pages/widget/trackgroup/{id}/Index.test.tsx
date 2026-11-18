import { render, screen } from "@testing-library/react";
import {
  TrackGroupWidgetData,
  useTrackGroupWidgetData,
} from "components/Widget/TrackGroupWidget/useTrackGroupWidgetData";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import Index from "./Index";

const { variantStub } = vi.hoisted(() => ({
  variantStub: (name: string) => ({
    default: (props: {
      track?: Track;
      currentSeconds?: number;
      embeddedInMirlo?: boolean;
    }) => (
      <div
        data-testid="variant"
        data-track-id={props.track?.id}
        data-release-tracks={props.track?.trackGroup?.tracks?.length}
        data-seconds={props.currentSeconds}
        data-embedded={String(props.embeddedInMirlo)}
      >
        {name}
      </div>
    ),
  }),
}));

vi.mock("components/Widget/TrackGroupWidget/variants/Card", () =>
  variantStub("album-card")
);
vi.mock("components/Widget/TrackGroupWidget/variants/Strip", () =>
  variantStub("album-strip")
);
vi.mock("components/Widget/TrackGroupWidget/variants/Compact", () =>
  variantStub("album-compact")
);
vi.mock("components/Widget/TrackWidget/variants/Card", () =>
  variantStub("track-card")
);
vi.mock("components/Widget/TrackWidget/variants/Strip", () =>
  variantStub("track-strip")
);

vi.mock("components/Widget/TrackGroupWidget/useTrackGroupWidgetData", () => ({
  useTrackGroupWidgetData: vi.fn(),
}));

const makeTrackGroup = (trackCount: number): TrackGroup =>
  ({
    id: 1,
    title: "Widget release",
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      id: 21 + index,
      title: `Track ${index + 1}`,
    })) as Track[],
  }) as TrackGroup;

const mockTrackGroup = (trackGroup: TrackGroup | undefined) => {
  vi.mocked(useTrackGroupWidgetData).mockReturnValue({
    trackGroup,
    artist: undefined,
    isLoading: !trackGroup,
    user: null,
    currentSeconds: 0,
    elapsedSeconds: 37,
    setCurrentSeconds: vi.fn(),
    embeddedInMirlo: true,
  } as unknown as TrackGroupWidgetData);
};

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/widget/trackGroup/1${search}`]}>
      <Index />
    </MemoryRouter>
  );

describe("trackGroup widget page", () => {
  beforeEach(() => {
    vi.mocked(useTrackGroupWidgetData).mockReset();
  });

  test.each([
    ["?variant=card", "track-card"],
    ["?variant=strip", "track-card"],
    ["?variant=compact", "track-strip"],
    ["", "track-card"],
    ["?variant=unknown", "track-card"],
  ])("renders a single with %s as %s", (search, expected) => {
    mockTrackGroup(makeTrackGroup(1));

    renderAt(search);

    expect(screen.getByTestId("variant")).toHaveTextContent(expected);
    expect(screen.getByTestId("variant")).toHaveAttribute(
      "data-track-id",
      "21"
    );
  });

  test("gives the single its release and the release playback state", () => {
    mockTrackGroup(makeTrackGroup(1));

    renderAt("?variant=card");

    const variant = screen.getByTestId("variant");
    expect(variant).toHaveAttribute("data-release-tracks", "1");
    expect(variant).toHaveAttribute("data-seconds", "37");
    expect(variant).toHaveAttribute("data-embedded", "true");
  });

  test.each([
    ["?variant=card", "album-card"],
    ["?variant=strip", "album-strip"],
    ["?variant=compact", "album-compact"],
    ["", "album-card"],
  ])("renders a multi-track release with %s as %s", (search, expected) => {
    mockTrackGroup(makeTrackGroup(2));

    renderAt(search);

    expect(screen.getByTestId("variant")).toHaveTextContent(expected);
  });

  test("renders the album variant while the release is loading", () => {
    mockTrackGroup(undefined);

    renderAt("?variant=compact");

    expect(screen.getByTestId("variant")).toHaveTextContent("album-compact");
  });
});
