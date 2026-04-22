import React from "react";
import { pick } from "lodash";
import api from "services/api";
import {
  TrackData,
  convertMetaData,
  fileListIntoArray,
  parse,
  produceNewStatus,
} from "components/ManageArtist/utils";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

const timeInBetweenUploads = 5000;

export type UploadQueueItem = {
  title: string;
  status: number;
  trackGroupId: number;
};

type Trackgroup = { artistId?: number; id: number; tracks: Track[] };

type EnqueueArgs = {
  trackgroup: Trackgroup;
  files: FileList | File[];
  reload?: (newTrack?: Track) => unknown;
};

type UploadContextValue = {
  queue: UploadQueueItem[];
  isActive: boolean;
  activeTrackGroupIds: number[];
  enqueue: (args: EnqueueArgs) => void;
};

const UploadContext = React.createContext<UploadContextValue>({
  queue: [],
  isActive: false,
  activeTrackGroupIds: [],
  enqueue: () => {},
});

const alertUser = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = "Upload in progress. Are you sure you want to leave?";
};

type OrderedTrackData = { order: number; t: TrackData };

export const UploadContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "uploadPanel" });
  const [queue, setQueue] = React.useState<UploadQueueItem[]>([]);
  const activeBatchesRef = React.useRef<Set<number>>(new Set());
  const pendingBatchesRef = React.useRef<
    {
      trackgroup: Trackgroup;
      tracks: OrderedTrackData[];
      reload?: (newTrack?: Track) => unknown;
    }[]
  >([]);
  const runningRef = React.useRef(false);

  const runNext = React.useCallback(async () => {
    if (runningRef.current) return;
    const batch = pendingBatchesRef.current.shift();
    if (!batch) return;
    runningRef.current = true;
    activeBatchesRef.current.add(batch.trackgroup.id);

    const { trackgroup, tracks, reload } = batch;

    const uploadNext = async (
      remainingTracks: OrderedTrackData[]
    ): Promise<void> => {
      const firstTrack = remainingTracks.pop();
      if (!firstTrack) {
        return;
      }

      const metadata = pick(firstTrack.t.metadata, ["format", "common"]);
      delete metadata.common.picture;
      const packet = {
        title: firstTrack.t.title,
        filename: firstTrack.t.file.name,
        metadata,
        artistId: trackgroup.artistId,
        isPreview: firstTrack.t.status === "preview",
        order: firstTrack.order,
        lyrics: Array.isArray(firstTrack.t.lyrics)
          ? firstTrack.t.lyrics.join("\n")
          : firstTrack.t.lyrics,
        isrc: firstTrack.t.isrc,
        trackGroupId: trackgroup.id,
        trackArtists: firstTrack.t.trackArtists.map((a) => ({
          ...a,
          artistId:
            a.artistId && isFinite(+a.artistId) ? +a.artistId : undefined,
        })),
      };

      setQueue((q) => produceNewStatus(q, firstTrack.t.title, 15));

      let newTrack: Track | undefined = undefined;

      try {
        const response = await api.post<
          Partial<Track>,
          { result: Track; uploadUrl: string }
        >(`manage/tracks`, packet);

        newTrack = response.result;
        setQueue((q) => produceNewStatus(q, firstTrack.t.title, 25));

        if (
          response.uploadUrl &&
          !response.uploadUrl.includes("minio:9000")
        ) {
          const result = await fetch(response.uploadUrl, {
            method: "PUT",
            body: firstTrack.t.file,
            headers: {
              Origin: "http://minio:9000",
            },
          });
          if (result.ok) {
            await api.put(`manage/tracks/${newTrack.id}/process`, {
              source: "upload",
            });
            setQueue((q) => produceNewStatus(q, firstTrack.t.title, 90));
          }
        } else {
          await api.uploadFile(`manage/tracks/${newTrack.id}/audio`, [
            firstTrack.t.file,
          ]);
        }
      } catch (e) {
        console.error(e);
        snackbar(
          `Something went wrong uploading track ${packet.title}. Please report this incident to hi@mirlo.space`,
          { type: "warning" }
        );
      }

      if (remainingTracks.length !== 0) {
        setQueue((q) => produceNewStatus(q, firstTrack.t.title, 99));

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            setQueue((q) => produceNewStatus(q, firstTrack.t.title, 100));
            try {
              reload?.(newTrack);
            } catch (err) {
              console.error("reload after track upload failed", err);
            }
            resolve();
          }, timeInBetweenUploads / 2);
        });

        await new Promise<void>((resolve) =>
          setTimeout(resolve, timeInBetweenUploads / 2)
        );

        await uploadNext(remainingTracks);
      } else {
        setQueue((q) => produceNewStatus(q, firstTrack.t.title, 100));
        try {
          reload?.(newTrack);
        } catch (err) {
          console.error("reload after final track upload failed", err);
        }
      }
    };

    try {
      await uploadNext(tracks);
      snackbar(t("uploadsComplete"), { type: "success" });
    } finally {
      activeBatchesRef.current.delete(trackgroup.id);
      runningRef.current = false;
      if (pendingBatchesRef.current.length > 0) {
        runNext();
      }
    }
  }, [snackbar, t]);

  const enqueue = React.useCallback(
    ({ trackgroup, files, reload }: EnqueueArgs) => {
      const fileArray =
        files instanceof FileList ? fileListIntoArray(files) : files;
      if (!fileArray.length) return;

      (async () => {
        const parsed = await parse(fileArray);
        const newTracks = parsed
          .sort((a, b) => {
            const firstComparable = a.metadata.common.track.no ?? a.file.name;
            const secondComparable = b.metadata.common.track.no ?? b.file.name;
            return (firstComparable ?? 0) > (secondComparable ?? 0) ? 1 : -1;
          })
          .map((p, i) => convertMetaData(p, i, trackgroup))
          .map((td, i) => ({
            order: Number.isFinite(+td.order) ? Number(td.order) : i + 1,
            t: td,
          }));

        setQueue((q) => [
          ...q,
          ...newTracks.map((nt) => ({
            title: nt.t.title,
            status: 5,
            trackGroupId: trackgroup.id,
          })),
        ]);

        pendingBatchesRef.current.push({
          trackgroup,
          tracks: newTracks,
          reload,
        });
        runNext();
      })();
    },
    [runNext]
  );

  const isActive = queue.length > 0;

  React.useEffect(() => {
    if (isActive) {
      window.addEventListener("beforeunload", alertUser);
      return () => {
        window.removeEventListener("beforeunload", alertUser);
      };
    }
  }, [isActive]);

  const activeTrackGroupIds = React.useMemo(
    () => Array.from(new Set(queue.map((q) => q.trackGroupId))),
    [queue]
  );

  const value = React.useMemo(
    () => ({ queue, isActive, activeTrackGroupIds, enqueue }),
    [queue, isActive, activeTrackGroupIds, enqueue]
  );

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
};

export const useUpload = () => React.useContext(UploadContext);

export default UploadContext;
