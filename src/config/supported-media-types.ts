export const HIGH_RES_AUDIO_MIME_TYPES = [
  "audio/x-flac",
  "audio/vnd.wave",
  "audio/aiff",
];

export const SUPPORTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg"];

export const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/aac",
  "audio/aiff",
  "audio/mp4",
  "audio/vnd.wave",
  "audio/mpeg",
  "audio/x-flac",
  "audio/x-m4a",
];

export const SUPPORTED_MEDIA_TYPES = [
  ...module.exports.SUPPORTED_AUDIO_MIME_TYPES,
  ...module.exports.SUPPORTED_IMAGE_MIME_TYPES,
  "text/csv",
];
