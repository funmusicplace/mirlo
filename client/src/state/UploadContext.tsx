import {
  TrackData,
  convertMetaData,
  fileListIntoArray,
  parse,
  produceNewStatus,
} from "components/ManageArtist/utils";
import { pick } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

const timeInBetweenUploads = 5000;

export type UploadQueueItem = {
  title: string;
  status: number;
  trackGroupId: number;
  image?: string; // base64 data URL or URL string
};

export type ImageQueueItem = {
  id: string;
  name: string;
  status: "waiting" | "active" | "completed" | "failed";
  thumbnail?: string;
  resourceKey?: string;
};

type Trackgroup = { artistId?: number; id: number; tracks: Track[] };

type EnqueueArgs = {
  trackgroup: Trackgroup;
  files: FileList | File[];
  reload?: (newTrack?: Track) => unknown;
  coverImage?: string; // base64 data URL for album cover from zip import
};

type EnqueueImageArgs = {
  name: string;
  endpoint: string;
  file: File;
  thumbnail?: string;
  resourceKey?: string;
  onComplete?: () => void;
};

type UploadContextValue = {
  queue: UploadQueueItem[];
  imageQueue: ImageQueueItem[];
  isActive: boolean;
  activeTrackGroupIds: number[];
  enqueue: (args: EnqueueArgs) => void;
  enqueueImage: (args: EnqueueImageArgs) => void;
};

const UploadContext = React.createContext<UploadContextValue>({
  queue: [],
  imageQueue: [],
  isActive: false,
  activeTrackGroupIds: [],
  enqueue: () => {},
  enqueueImage: () => {},
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
  const [imageQueue, setImageQueue] = React.useState<ImageQueueItem[]>([]);
  const activeBatchesRef = React.useRef<Set<number>>(new Set());
  const pendingBatchesRef = React.useRef<
    {
      trackgroup: Trackgroup;
      tracks: OrderedTrackData[];
      reload?: (newTrack?: Track) => unknown;
    }[]
  >([]);
  const runningRef = React.useRef(false);
  const imageJobsRef = React.useRef<
    { itemId: string; jobId: string; onComplete?: () => void }[]
  >([]);
  const imagePollerRef = React.useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined);

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

        if (response.uploadUrl && !response.uploadUrl.includes("minio:9000")) {
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

  const startImagePolling = React.useCallback(() => {
    if (imagePollerRef.current !== undefined) return;
    imagePollerRef.current = setInterval(async () => {
      const jobs = imageJobsRef.current;
      if (jobs.length === 0) {
        clearInterval(imagePollerRef.current);
        imagePollerRef.current = undefined;
        return;
      }
      try {
        const result = await api.getMany<{ jobStatus: string; jobId: string }>(
          `jobs?queue=optimizeImage&${jobs.map((j) => `ids=${j.jobId}`).join("&")}`
        );
        setImageQueue((q) =>
          q.map((item) => {
            const job = jobs.find((j) => j.itemId === item.id);
            if (!job) return item;
            const jobResult = result.results.find((r) => r.jobId === job.jobId);
            if (!jobResult) return item;
            const status: ImageQueueItem["status"] =
              jobResult.jobStatus === "completed" ||
              jobResult.jobStatus === "unknown"
                ? "completed"
                : jobResult.jobStatus === "failed"
                  ? "failed"
                  : "active";
            return { ...item, status };
          })
        );
        const done = result.results.filter(
          (r) =>
            r.jobStatus === "completed" ||
            r.jobStatus === "unknown" ||
            r.jobStatus === "failed"
        );
        for (const doneJob of done) {
          const jobEntry = imageJobsRef.current.find(
            (j) => j.jobId === doneJob.jobId
          );
          if (jobEntry) {
            if (
              doneJob.jobStatus === "completed" ||
              doneJob.jobStatus === "unknown"
            ) {
              jobEntry.onComplete?.();
            }
            imageJobsRef.current = imageJobsRef.current.filter(
              (j) => j.jobId !== doneJob.jobId
            );
            setTimeout(() => {
              setImageQueue((q) =>
                q.filter((item) => item.id !== jobEntry.itemId)
              );
            }, 2000);
          }
        }
      } catch (e) {
        console.error("Error polling image jobs", e);
      }
    }, 5000);
  }, []);

  const enqueueImage = React.useCallback(
    ({
      name,
      endpoint,
      file,
      thumbnail,
      resourceKey,
      onComplete,
    }: EnqueueImageArgs) => {
      const itemId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setImageQueue((q) => [
        ...q,
        { id: itemId, name, status: "waiting", thumbnail, resourceKey },
      ]);
      (async () => {
        try {
          const response = await api.uploadFile(endpoint, [file]);
          const jobId = response?.result?.jobId;
          if (jobId) {
            imageJobsRef.current = [
              ...imageJobsRef.current,
              { itemId, jobId, onComplete },
            ];
            setImageQueue((q) =>
              q.map((item) =>
                item.id === itemId ? { ...item, status: "active" } : item
              )
            );
            startImagePolling();
          } else {
            setImageQueue((q) =>
              q.map((item) =>
                item.id === itemId ? { ...item, status: "completed" } : item
              )
            );
            onComplete?.();
            setTimeout(
              () =>
                setImageQueue((q) => q.filter((item) => item.id !== itemId)),
              2000
            );
          }
        } catch (e) {
          console.error("Error uploading image", e);
          setImageQueue((q) =>
            q.map((item) =>
              item.id === itemId ? { ...item, status: "failed" } : item
            )
          );
          setTimeout(
            () => setImageQueue((q) => q.filter((item) => item.id !== itemId)),
            3000
          );
        }
      })();
    },
    [startImagePolling]
  );

  const enqueue = React.useCallback(
    ({ trackgroup, files, reload, coverImage }: EnqueueArgs) => {
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
          ...newTracks.map((nt) => {
            // Extract image from coverImage parameter (zip import) or embedded metadata
            let image: string | undefined = coverImage;

            if (!image && nt.t.metadata?.common?.picture?.[0]) {
              try {
                const picture = nt.t.metadata.common.picture[0];
                const bytes = new Uint8Array(picture.data);
                const binaryString = bytes.reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ""
                );
                const base64 = btoa(binaryString);
                image = `data:${picture.format};base64,${base64}`;
              } catch (error) {
                console.error("Error converting image to base64", error);
              }
            }

            return {
              title: nt.t.title,
              status: 5,
              trackGroupId: trackgroup.id,
              image,
            };
          }),
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

  const isActive = queue.length > 0 || imageQueue.length > 0;

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
    () => ({
      queue,
      imageQueue,
      isActive,
      activeTrackGroupIds,
      enqueue,
      enqueueImage,
    }),
    [queue, imageQueue, isActive, activeTrackGroupIds, enqueue, enqueueImage]
  );

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
};

export const useUpload = () => React.useContext(UploadContext);

export default UploadContext;
