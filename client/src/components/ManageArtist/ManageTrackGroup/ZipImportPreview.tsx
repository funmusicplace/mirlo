import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import { uploadDownloadableContentFile } from "components/ManageArtist/Merch/DownloadableContent";
import { useSaveAlbumFormMutation } from "queries";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { useUpload } from "state/UploadContext";

interface ZipImportPreviewProps {
  trackGroupId: number;
  artistId: number;
  reload: () => void;
  isOpen: boolean;
  preScanResult: PreScanResult | null;
  existingTracksCount: number;
  selectedCoverIndex: number;
  onSelectedCoverChange: (index: number) => void;
  invalidFilesAction: "skip" | "cancel" | null;
  onInvalidFilesActionChange: (action: "skip" | "cancel") => void;
  onClose: () => void;
}

export const ZipImportPreview: React.FC<ZipImportPreviewProps> = ({
  trackGroupId,
  artistId,
  reload,
  isOpen,
  preScanResult,
  existingTracksCount,
  selectedCoverIndex,
  onSelectedCoverChange,
  invalidFilesAction,
  onInvalidFilesActionChange,
  onClose,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "zipImport" });
  const { enqueue, enqueueImage } = useUpload();
  const saveMutation = useSaveAlbumFormMutation();

  const hasInvalidFiles = (preScanResult?.invalidFiles.length ?? 0) > 0;

  const canConfirm =
    (preScanResult?.audioFiles.length ?? 0) > 0 &&
    (!hasInvalidFiles || invalidFilesAction === "skip");

  const sortedAudioFiles = useMemo(
    () =>
      [...(preScanResult?.audioFiles ?? [])].sort((a, b) => {
        const aNum = a.trackNumber ?? Infinity;
        const bNum = b.trackNumber ?? Infinity;
        return aNum - bNum;
      }),
    [preScanResult?.audioFiles]
  );

  const albumMeta = preScanResult?.albumMeta ?? {};
  const hasAlbumMeta =
    albumMeta.title ||
    albumMeta.albumArtist ||
    albumMeta.year ||
    albumMeta.date ||
    albumMeta.label ||
    albumMeta.releaseDate ||
    albumMeta.description ||
    (albumMeta.genres?.length ?? 0) > 0;

  const handleZipImportConfirm = React.useCallback(
    async (result: PreScanResult | null, coverIndex: number) => {
      if (!result) {
        return;
      }

      // Update the track group with album meta data.
      const meta = result.albumMeta;
      try {
        await saveMutation.mutateAsync({
          trackGroupId,
          formData: {
            title: meta.title ?? "",
            releaseDate: meta.releaseDate ?? undefined,
            about: meta.description ?? undefined,
          },
          artistId,
        });
      } catch (e) {
        console.error("Error saving album metadata", e);
      }

      // Upload cover image — queued so the progress panel tracks the optimize-image job
      const coverFile = result.imageFiles[coverIndex]?.file;
      if (coverFile) {
        enqueueImage({
          name: t("albumCover"),
          endpoint: `manage/trackGroups/${trackGroupId}/cover`,
          file: coverFile,
          thumbnail: URL.createObjectURL(coverFile),
          resourceKey: `trackGroup-${trackGroupId}`,
          onComplete: reload,
        });
      }

      // Enqueue audio files using UploadContext — same pattern as BulkTrackUpload
      if (result.audioFiles.length > 0) {
        enqueue({
          trackgroup: { id: trackGroupId, artistId, tracks: [] },
          files: result.audioFiles.map((af) => af.file),
          reload,
        });
      }

      // Upload downloadable content using the shared utility
      for (const dc of result.downloadableContentFiles) {
        try {
          await uploadDownloadableContentFile(dc.file, { trackGroupId });
        } catch (e) {
          console.error("Error uploading downloadable content", e);
        }
      }

      onClose();
      reload();
    },
    [trackGroupId, artistId, enqueue, enqueueImage, reload, onClose]
  );

  return (
    <Modal
      open={isOpen && preScanResult !== null}
      onClose={onClose}
      title={t("previewTitle")}
      size="small"
      focusTrapOptions={{ delayInitialFocus: true }}
    >
      {existingTracksCount > 0 && (
        <div className="p-4 rounded-[var(--mi-border-radius)] mb-4 flex gap-3 bg-[rgba(255,193,7,0.1)] border-l-4 border-[#FFC107]">
          <div className="text-xl flex-shrink-0 mt-1">⚠️</div>
          <div className="text-sm leading-snug">
            {t("existingTracksWarning", { count: existingTracksCount })}
          </div>
        </div>
      )}

      {preScanResult && hasInvalidFiles && (
        <div className="p-4 rounded-[var(--mi-border-radius)] mb-4 flex gap-3 bg-[rgba(244,67,54,0.1)] border-l-4 border-[#F44336]">
          <div className="text-xl flex-shrink-0 mt-1">
            <FaExclamationTriangle />
          </div>
          <div className="text-sm leading-snug">
            {t("invalidFilesFound", {
              count: preScanResult.invalidFiles.length,
            })}
            <ul className="mt-2 ml-6 p-0 text-xs">
              {preScanResult.invalidFiles.map((f) => (
                <li
                  key={f.name}
                  className="text-[var(--mi-lighter-foreground-color)] mb-1"
                >
                  {f.name} — {f.reason}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="invalidAction"
                  value="skip"
                  checked={invalidFilesAction === "skip"}
                  onChange={() => onInvalidFilesActionChange("skip")}
                />
                {t("skipInvalidFiles")}
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="radio"
                  name="invalidAction"
                  value="cancel"
                  checked={invalidFilesAction === "cancel"}
                  onChange={() => onInvalidFilesActionChange("cancel")}
                />
                {t("cancelImport")}
              </label>
            </div>
          </div>
        </div>
      )}

      {hasAlbumMeta && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-[var(--mi-text-color)] flex items-center gap-2">
            {t("albumDetails")}
          </h3>
          <dl className="grid grid-cols-[auto_1fr] gap-y-1 gap-x-3 m-0 text-sm">
            {albumMeta.title && (
              <>
                <dt className="text-[var(--mi-lighter-foreground-color)] font-semibold whitespace-nowrap">
                  {t("albumTitle")}
                </dt>
                <dd className="m-0 text-[var(--mi-text-color)]">
                  {albumMeta.title}
                </dd>
              </>
            )}
            {albumMeta.albumArtist && (
              <>
                <dt className="text-[var(--mi-lighter-foreground-color)] font-semibold whitespace-nowrap">
                  {t("albumArtist")}
                </dt>
                <dd className="m-0 text-[var(--mi-text-color)]">
                  {albumMeta.albumArtist}
                </dd>
              </>
            )}
            {(albumMeta.date || albumMeta.year) && (
              <>
                <dt className="text-[var(--mi-lighter-foreground-color)] font-semibold whitespace-nowrap">
                  {t("releaseDate")}
                </dt>
                <dd className="m-0 text-[var(--mi-text-color)]">
                  {albumMeta.releaseDate ?? String(albumMeta.releaseDate)}
                </dd>
              </>
            )}
            {albumMeta.description && (
              <>
                <dt className="text-[var(--mi-lighter-foreground-color)] font-semibold whitespace-nowrap">
                  {t("albumDescription")}
                </dt>
                <dd className="m-0 text-[var(--mi-text-color)] whitespace-pre-wrap line-clamp-4">
                  {albumMeta.description}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {preScanResult && preScanResult.audioFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-[var(--mi-text-color)] flex items-center gap-2">
            <span className="text-[var(--mi-success-background-color)] flex items-center gap-1">
              <FaCheckCircle /> {preScanResult.audioFiles.length}
            </span>
            {t("tracksFound")}
          </h3>
          <div className="flex flex-col gap-2">
            {sortedAudioFiles.map((af, idx) => (
              <div
                key={`${af.file.name}-${idx}`}
                className="p-3 bg-[var(--mi-tint-color)] rounded-[var(--mi-border-radius)] text-sm"
              >
                <div>
                  {af.trackNumber && (
                    <span className="font-semibold text-[var(--mi-button-color)] mr-2">
                      {af.trackNumber}.
                    </span>
                  )}
                  <span className="text-[var(--mi-text-color)]">
                    {af.title}
                  </span>
                </div>
                {af.artists.length > 0 && (
                  <span className="text-xs text-[var(--mi-lighter-foreground-color)] block mt-1">
                    {t("artists")}: {af.artists.join(", ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {preScanResult && preScanResult.imageFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-[var(--mi-text-color)] flex items-center gap-2">
            {t("selectCoverImage")}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 mb-4">
            {preScanResult.imageFiles.map((img, idx) => (
              <label
                key={`${img.name}-${idx}`}
                className={`relative cursor-pointer rounded-[var(--mi-border-radius)] overflow-hidden border-[3px] transition-all duration-200 hover:border-[var(--mi-button-color)] ${
                  idx === selectedCoverIndex
                    ? "border-[var(--mi-button-color)]"
                    : "border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="coverImage"
                  value={idx}
                  checked={idx === selectedCoverIndex}
                  onChange={() => onSelectedCoverChange(idx)}
                  className="absolute top-2 right-2 z-[2]"
                />
                {img.dataUrl && (
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-full h-[100px] object-cover block"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {preScanResult && preScanResult.downloadableContentFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-[var(--mi-text-color)] flex items-center gap-2">
            <span className="text-[var(--mi-success-background-color)] flex items-center gap-1">
              <FaCheckCircle /> {preScanResult.downloadableContentFiles.length}
            </span>
            {t("downloadableContentFound")}
          </h3>
          <div className="flex flex-col gap-2">
            {preScanResult.downloadableContentFiles.map((dc, idx) => (
              <div
                key={`${dc.name}-${idx}`}
                className="p-3 bg-[var(--mi-tint-color)] rounded-[var(--mi-border-radius)] text-sm"
              >
                <span className="text-[var(--mi-text-color)]">{dc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preScanResult && preScanResult.audioFiles.length === 0 && (
        <div className="p-4 rounded-[var(--mi-border-radius)] mb-4 flex gap-3 bg-[rgba(244,67,54,0.1)] border-l-4 border-[#F44336]">
          <div className="text-xl flex-shrink-0 mt-1">
            <FaExclamationTriangle />
          </div>
          <div className="text-sm leading-snug">{t("noAudioFilesFound")}</div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <ArtistButton onClick={onClose} variant="outlined">
          {t("cancel")}
        </ArtistButton>
        <ArtistButton
          onClick={() =>
            handleZipImportConfirm(preScanResult, selectedCoverIndex)
          }
          disabled={!canConfirm}
        >
          {t("confirmImport")}
        </ArtistButton>
      </div>
    </Modal>
  );
};
