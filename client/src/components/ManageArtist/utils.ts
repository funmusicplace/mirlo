import produce from "immer";
import type {
  IAudioMetadata,
  ICommonTagsResult,
} from "music-metadata/lib/type";

import { ACCEPTED_AUDIO } from "./ManageTrackGroup/AlbumFormComponents/ReplaceTrackAudioInput";
import { DOWNLOADABLE_CONTENT_MIME_TYPES } from "./Merch/DownloadableContent";

const produceNewStatusImpl = produce(
  (
    queue: { title: string; status: number }[],
    title: string,
    status: number
  ) => {
    const idx = queue.findIndex((i) => i.title === title);
    if (status === 100) {
      queue.splice(idx, 1);
      return queue;
    }
    if (queue?.[idx]) {
      queue[idx] = {
        ...queue[idx],
        status: status,
      };
    }
    return queue;
  }
);

export const produceNewStatus = <T extends { title: string; status: number }>(
  queue: T[],
  title: string,
  status: number
): T[] =>
  produceNewStatusImpl(
    queue as { title: string; status: number }[],
    title,
    status
  ) as T[];

export const fileListIntoArray = (fileList: FileList) => {
  if (fileList?.length > 0) {
    const files = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (file) {
        files.push(file);
      }
    }
    return files;
  }

  return [];
};

export interface TrackData {
  trackId?: number;
  uploadPercent?: number;
  hide?: boolean;
  duration?: number;
  file: File;
  title: string;
  status: Track["status"];
  order: string;
  lyrics?: string;
  isrc?: string;
  metadata: { [key: string]: any };
  trackArtists: {
    artistName?: string;
    artistId?: number;
    role?: string;
    isCoAuthor?: boolean;
    id?: string;
    trackId?: number;
    order: number;
  }[];
}

type ParsedItem = {
  file: File;
  metadata: IAudioMetadata;
};

export const convertMetaData = (
  p: ParsedItem,
  i: number,
  trackGroup: {
    tracks: Track[];
    artist?: Artist;
    artistId?: number;
    defaultIsPreview?: boolean;
  }
) => {
  let title = p.metadata.common.title;

  if (!title) {
    title = p.file.name ?? "";
    title = title.replace(/\.wav$/, "");
  }

  let isrc = p.metadata.common.isrc?.[0];

  return {
    metadata: p.metadata,
    order: `${
      p.metadata.common.track.no && Number.isFinite(+p.metadata.common.track.no)
        ? Number(p.metadata.common.track.no)
        : trackGroup.tracks.length + i + 1
    }`,
    duration: p.metadata.format.duration,
    file: p.file,
    title: title,
    status: trackGroup.defaultIsPreview === false ? "must-own" : "preview",
    lyrics: p.metadata.common.lyrics,
    isrc: isrc,
    trackArtists:
      p.metadata.common.artists?.map((artist, idx) => ({
        artistName: artist ?? "",
        role: "",
        isCoAuthor: true,
        order: idx,
        artistId:
          artist === trackGroup.artist?.name ? trackGroup.artistId : undefined,
      })) ?? [],
  } as TrackData;
};

export const parse = async (files: File[]): Promise<ParsedItem[]> => {
  const { parseBlob } = await import("music-metadata-browser");
  const parsed = await Promise.all(
    files.map(async (file) => {
      try {
        const parsedFile = await parseBlob(file);
        return {
          file,
          metadata: parsedFile,
        };
      } catch (e) {
        console.error("Error parsing metadata", e);
        return {
          file,
          metadata: {
            common: {
              title: file.name,
            } as ICommonTagsResult,
          } as IAudioMetadata,
        };
      }
    })
  );
  return parsed;
};

// Zip Import Utilities

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
];

// Use the same audio formats as ACCEPTED_AUDIO
const AUDIO_MIME_TYPES = ACCEPTED_AUDIO.split(",").map((type) => type.trim());

export const extractZipFiles = async (
  zipFile: File
): Promise<{ files: File[]; errorMessage?: string }> => {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const loaded = await zip.loadAsync(zipFile);

    const files: File[] = [];

    for (const [filename, fileData] of Object.entries(loaded.files)) {
      // Skip directories and macOS system files
      if (fileData.dir || filename.includes("__MACOSX")) {
        continue;
      }

      const blob = await fileData.async("blob");
      const file = new File([blob], filename, { type: blob.type });
      files.push(file);
    }

    return { files };
  } catch (error) {
    console.error("Error extracting zip", error);
    return {
      files: [],
      errorMessage: `Failed to extract zip file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const prescanAudioFiles = async (
  files: File[]
): Promise<PreScanResult> => {
  const audioFiles: ExtractedAudioFile[] = [];
  const imageFiles: ExtractedImageFile[] = [];
  const downloadableContentFiles: ExtractedDownloadableContentFile[] = [];
  const invalidFiles: { name: string; reason: string }[] = [];

  // Separate audio and image files
  for (const file of files) {
    const mimeType = file.type || getMimeTypeFromExtension(file.name);
    if (AUDIO_MIME_TYPES.includes(mimeType)) {
      audioFiles.push({
        file,
        title: file.name,
        artists: [],
        trackNumber: null,
      });
    } else if (IMAGE_MIME_TYPES.includes(mimeType)) {
      imageFiles.push({ file, name: file.name });
    } else if (DOWNLOADABLE_CONTENT_MIME_TYPES.includes(mimeType)) {
      downloadableContentFiles.push({ file, name: file.name });
    } else {
      // Only flag as invalid if it's not a known system file
      if (!isSystemFile(file.name)) {
        invalidFiles.push({
          name: file.name,
          reason: "Unsupported file format",
        });
      }
    }
  }

  // Parse ID3 metadata for audio files
  const parsed = await parse(audioFiles.map((af) => af.file));
  const enhancedAudioFiles = audioFiles.map((af, idx) => {
    const metadata = parsed[idx];
    const title = metadata.metadata.common.title || af.file.name;
    const trackNumber = metadata.metadata.common.track.no
      ? Number(metadata.metadata.common.track.no)
      : null;
    const artists = metadata.metadata.common.artists || [];

    return {
      ...af,
      title,
      trackNumber,
      artists: artists as string[],
      duration: metadata.metadata.format.duration,
      isrc: metadata.metadata.common.isrc?.[0],
      lyrics: metadata.metadata.common.lyrics,
      genre: metadata.metadata.common.genre,
      album: metadata.metadata.common.album,
      releaseDate: metadata.metadata.common.date,
      license: metadata.metadata.common.license,
    };
  });

  // Generate data URLs for images
  for (const imageFile of imageFiles) {
    try {
      const dataUrl = await fileToDataUrl(imageFile.file);
      imageFile.dataUrl = dataUrl;
    } catch (error) {
      console.error("Error converting image to data URL", error);
    }
  }

  return {
    audioFiles: enhancedAudioFiles,
    imageFiles,
    downloadableContentFiles,
    invalidFiles,
    albumMeta: {
      title: parsed[0]?.metadata.common.album,
      year: parsed[0]?.metadata.common.year,
      date: parsed[0]?.metadata.common.date,
      label: parsed[0]?.metadata.common.label?.[0],
      genres: parsed[0]?.metadata.common.genre,
      albumArtist: parsed[0]?.metadata.common.albumartist,
      releaseDate: parsed[0]?.metadata.common.date,
    },
  };
};

const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const extMap: { [key: string]: string } = {
    flac: "audio/flac",
    wav: "audio/wav",
    aiff: "audio/aiff",
    aac: "audio/aac",
    m4a: "audio/x-m4a",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    tiff: "image/tiff",
    pdf: "application/pdf",
  };
  return extMap[ext] || "";
};

const isSystemFile = (filename: string): boolean => {
  const systemPatterns = [
    /^\.DS_Store$/,
    /^Thumbs\.db$/,
    /^desktop\.ini$/,
    /^\._/,
  ];
  return systemPatterns.some((pattern) => pattern.test(filename));
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
};
