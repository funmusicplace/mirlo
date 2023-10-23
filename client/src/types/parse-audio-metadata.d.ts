declare module "parse-audio-metadata" {
  export = parseAudioMetadata;
}

declare function parseAudioMetadata(file: File): { [key: string]: unknown };
