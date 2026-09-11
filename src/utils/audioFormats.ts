import { AppError } from "./error";

/**
 * Audio formats we accept for upload, kept in sync with the client's
 * `ACCEPTED_AUDIO` list in
 * `client/src/components/ManageArtist/ManageTrackGroup/AlbumFormComponents/ReplaceTrackAudioInput.tsx`.
 *
 * The `accept` attribute on a file input is only a hint to the file picker —
 * drag-and-drop, the zip upload path, and any direct API call all bypass it —
 * so lossy files were reaching us and getting stored with a `.mp3` extension.
 * See #1403.
 */
export const ACCEPTED_AUDIO_EXTENSIONS = [
  "flac",
  "wav",
  "aif",
  "aiff",
  "aac",
  "m4a",
];

export const audioExtensionFromFilename = (filename?: string | null) => {
  const extension = filename?.split(".").pop()?.toLowerCase();

  // A filename with no dot at all yields the whole name back from `pop()`,
  // which the allowlist below rejects along with everything else unsupported.
  return extension && ACCEPTED_AUDIO_EXTENSIONS.includes(extension)
    ? extension
    : undefined;
};

export const unsupportedAudioFormatError = (filename?: string | null) =>
  new AppError({
    httpCode: 400,
    description: `"${
      filename ?? "This file"
    }" isn't a supported audio format. Please upload one of: ${ACCEPTED_AUDIO_EXTENSIONS.join(
      ", "
    ).toUpperCase()}.`,
  });

/**
 * Returns the normalized extension or throws a 400. Use at every point where a
 * caller-supplied filename decides what we store as `TrackAudio.fileExtension`.
 */
export const assertSupportedAudioExtension = (filename?: string | null) => {
  const extension = audioExtensionFromFilename(filename);

  if (!extension) {
    throw unsupportedAudioFormatError(filename);
  }

  return extension;
};
