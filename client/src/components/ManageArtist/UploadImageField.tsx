import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiFillDelete } from "react-icons/ai";
import { useSnackbar } from "state/SnackbarContext";
import { formatAcceptList } from "utils/uploadFormats";
import useJobStatusCheck from "utils/useJobStatusCheck";
import useObjectUrl from "utils/useObjectUrl";

import { Spinner, UploadPrompt } from "./UploadImage";

const noop = () => {};

const UploadImageField: React.FC<{
  inputId: string;
  imageUrl?: string;
  upload: (file: File) => Promise<{ jobId?: string }>;
  remove: () => Promise<void>;
  onProcessed: () => Promise<void> | void;
  alt?: string;
  rounded?: boolean;
  naturalRatio?: boolean;
  maxWidth?: string;
  height: string;
  width: string;
  maxDimensions: string;
  maxSize: string;
  imageTypeDescription: string;
  isLoading?: boolean;
}> = ({
  inputId,
  imageUrl,
  upload,
  remove,
  onProcessed,
  alt,
  rounded,
  naturalRatio,
  maxWidth = "400px",
  height,
  width,
  maxDimensions,
  maxSize,
  imageTypeDescription,
  isLoading: externalIsLoading,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File>();
  const pendingPreview = useObjectUrl(pendingFile);
  const displayedImage = pendingPreview ?? imageUrl;

  const handleProcessed = React.useCallback(async () => {
    await onProcessed();
    setPendingFile(undefined);
  }, [onProcessed]);

  const reportFailedJob = React.useCallback(() => {
    setPendingFile(undefined);
    snackbar(t("somethingWentWrong", { keyPrefix: "manageArtist" }), {
      type: "warning",
    });
  }, [snackbar, t]);

  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: noop,
    reset: handleProcessed,
    onFailed: reportFailedJob,
    queue: "optimizeImage",
  });

  const deleteImage = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await remove();
      setPendingFile(undefined);
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }, [remove, snackbar]);

  const onFileChosen = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      setIsSaving(true);
      try {
        setPendingFile(file);
        const { jobId } = await upload(file);
        if (jobId) {
          setUploadJobs([{ jobId, jobStatus: "waiting" }]);
        } else {
          await handleProcessed();
        }
      } catch (e) {
        setPendingFile(undefined);
        snackbar("Something went wrong", { type: "warning" });
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    },
    [upload, handleProcessed, setUploadJobs, snackbar]
  );

  const isLoading =
    externalIsLoading ||
    (uploadJobs?.[0]?.jobStatus !== undefined &&
      uploadJobs?.[0]?.jobStatus !== "completed");

  const roundedClass = rounded ? "rounded-full" : "";

  return (
    <div
      className="flex h-full w-full flex-col flex-wrap items-start"
      style={{ maxWidth }}
    >
      <label htmlFor={inputId} className="relative mb-4">
        {displayedImage && (
          <div className="group">
            <span
              className={`absolute top-0 left-0 z-[999] flex h-full w-full cursor-pointer items-center justify-center bg-black/30 text-center leading-none text-transparent opacity-0 group-hover:text-white group-hover:opacity-100 max-md:h-[96%] max-md:text-(length:--mi-font-size-xsmall) ${roundedClass}`}
            >
              {t("replaceImage")}
            </span>
            <img
              src={displayedImage}
              alt={alt}
              className={`w-full cursor-pointer transition-[filter] duration-250 hover:brightness-80 max-md:max-w-full ${naturalRatio ? "h-auto" : "aspect-square object-cover"} ${roundedClass}`}
            />
          </div>
        )}

        {!displayedImage && (
          <UploadPrompt
            width={width}
            height={height}
            rounded={rounded}
            imageTypeDescription={imageTypeDescription}
          />
        )}
        {(isLoading || isSaving) && <Spinner rounded={rounded} />}
      </label>

      <div className="flex flex-col">
        <InputEl
          type="file"
          id={inputId}
          accept="image/*"
          onChange={onFileChosen}
        />
        <small className="mt-2 w-full max-md:text-(length:--mi-font-size-xsmall)">
          {t("dimensionsTip", { maxDimensions, maxSize })}
        </small>
        <small className="mt-1 w-full opacity-70 max-md:text-(length:--mi-font-size-xsmall)">
          {t("acceptedFormats", {
            keyPrefix: "manageAlbum",
            formats: formatAcceptList("image/*"),
          })}
        </small>
      </div>
      {imageUrl && (
        <ArtistButton
          aria-label={t("deleteImage")}
          onClick={deleteImage}
          variant="dashed"
          onlyIcon
          type="button"
          startIcon={<AiFillDelete />}
        />
      )}
    </div>
  );
};

export default UploadImageField;
