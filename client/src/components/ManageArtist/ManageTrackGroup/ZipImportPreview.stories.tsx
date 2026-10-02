import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "@storybook/test";
import React from "react";

import {
  COVERS,
  RELEASES,
  SHOWCASE_ARTIST,
} from "../../../showcase/shared/fixtures";

import { ZipImportPreview } from "./ZipImportPreview";

const RELEASE = RELEASES.tidal;

const file = (name: string, type: string) => new File([""], name, { type });

/**
 * What prescanAudioFiles() makes of "Lumen Tide - Tidal Hours.zip": six
 * tagged FLACs, a cover and a lyric booklet.
 */
const PRESCAN_RESULT: PreScanResult = {
  audioFiles: RELEASE.tracks.map((track, i) => ({
    file: file(
      track.audio?.originalFilename ?? `${track.title}.flac`,
      "audio/flac"
    ),
    title: track.title ?? "",
    artists: [SHOWCASE_ARTIST.name],
    trackNumber: i + 1,
    duration: track.audio?.duration,
  })),
  imageFiles: [
    {
      file: file("cover.svg", "image/svg+xml"),
      name: "cover.svg",
      dataUrl: COVERS.tidal.sizes["300"],
    },
  ],
  downloadableContentFiles: [
    {
      file: file("Tidal Hours - lyric booklet.pdf", "application/pdf"),
      name: "Tidal Hours - lyric booklet.pdf",
    },
  ],
  invalidFiles: [],
  albumMeta: {
    title: RELEASE.title,
    albumArtist: SHOWCASE_ARTIST.name,
    year: 2026,
    date: "2026-09-12",
    releaseDate: "2026-09-12",
    genres: ["Ambient", "Folk"],
    description: "Recorded over a long winter in a converted boathouse.",
  },
};

type PreviewProps = React.ComponentProps<typeof ZipImportPreview>;

/** Keeps the cover and invalid-files choices in state, as ZipDropZone does */
const StatefulPreview: React.FC<PreviewProps> = (props) => {
  const [coverIndex, setCoverIndex] = React.useState(props.selectedCoverIndex);
  const [invalidAction, setInvalidAction] = React.useState(
    props.invalidFilesAction
  );
  return (
    <ZipImportPreview
      {...props}
      selectedCoverIndex={coverIndex}
      onSelectedCoverChange={setCoverIndex}
      invalidFilesAction={invalidAction}
      onInvalidFilesActionChange={setInvalidAction}
    />
  );
};

/**
 * The preview shown after dropping a zip on a release: album details read
 * from the tags, the tracks in order, a choice of cover and any downloadable
 * files, before anything is uploaded.
 */
const meta = {
  title: "ManageArtist/ManageTrackGroup/ZipImportPreview",
  component: ZipImportPreview,
  render: (args) => <StatefulPreview {...args} />,
  args: {
    trackGroupId: RELEASE.id,
    artistId: SHOWCASE_ARTIST.id,
    reload: fn(),
    onClose: fn(),
    isOpen: true,
    preScanResult: PRESCAN_RESULT,
    existingTracksCount: 0,
    selectedCoverIndex: 0,
    onSelectedCoverChange: fn(),
    invalidFilesAction: null,
    onInvalidFilesActionChange: fn(),
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ZipImportPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const waitForPreview = async () => {
  // The modal renders in a portal outside the canvas
  await expect(
    await within(document.body).findByText("Tracks found", undefined, {
      timeout: 5000,
    })
  ).toBeInTheDocument();
};

/** Six tracks, a cover and a PDF booklet, ready to import */
export const Default: Story = {
  play: waitForPreview,
};

/**
 * The zip also held files Mirlo can't import. Import stays disabled until
 * the artist chooses to skip them.
 */
export const WithInvalidFiles: Story = {
  args: {
    preScanResult: {
      ...PRESCAN_RESULT,
      invalidFiles: [
        { name: "Low Water (session).aup3", reason: "Unsupported file format" },
        { name: "mixing notes.docx", reason: "Unsupported file format" },
      ],
    },
  },
  play: waitForPreview,
};

/** Importing into a release that already has tracks warns about it first */
export const ReleaseHasTracks: Story = {
  args: { existingTracksCount: 3 },
  play: waitForPreview,
};
