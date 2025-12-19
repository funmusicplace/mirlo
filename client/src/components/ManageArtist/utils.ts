import { IAudioMetadata, ICommonTagsResult } from "music-metadata/lib/type";
import produce from "immer";
import { parseBlob } from "music-metadata-browser";
import styled from "@emotion/styled";
import { InputEl } from "components/common/Input";

export const produceNewStatus = produce(
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
        title: queue[idx].title,
        status: status,
      };
    }
    return queue;
  }
);

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
  trackGroup: { tracks: Track[]; artist?: Artist; artistId?: number }
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
    status: "preview",
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

export const UploadLabelWrapper = styled("label")`
  position: relative;
  display: flex;
  gap: 10px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding: 20px;
  border-radius: 10px;
  border: 2px dashed #555;
  width: 100%;
  color: var(--mi-foreground-color);
  cursor: pointer;
  transition:
    background 0.2s ease-in-out,
    border 0.2s ease-in-out;
`;

export const UploadField = styled(InputEl)`
  height: 100%;
  position: absolute;

  transition: 0.25s opacity;

  &:hover {
    opacity: 0.8;
  }
`;
