import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { ArtistButton } from "components/Artist/ArtistButtons";
import SortableGridItem from "components/common/SortableGridItem";
import {
  useDeleteMerchImageMutation,
  useReorderMerchImagesMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiFillDelete } from "react-icons/ai";
import { FaPlus } from "react-icons/fa";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { formatAcceptList } from "utils/uploadFormats";
import useJobStatusCheck from "utils/useJobStatusCheck";
import useSortableReorder from "utils/useSortableReorder";

import { Spinner } from "../UploadImage";

const MerchImagesEditor: React.FC<{
  merch: Merch;
  reload: () => unknown;
}> = ({ merch, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const [isUploading, setIsUploading] = React.useState(false);
  const { mutateAsync: deleteImage, isPending: isDeleting } =
    useDeleteMerchImageMutation();
  const { mutateAsync: reorderImages, isPending: isReordering } =
    useReorderMerchImagesMutation();

  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload,
    queue: "optimizeImage",
  });

  const {
    items: images = [],
    sensors,
    onDragEnd,
  } = useSortableReorder(merch.images, async (merchImageIds) => {
    await reorderImages({ merchId: merch.id, merchImageIds });
  });
  const isProcessing = uploadJobs.length > 0;
  const isBusy = isUploading || isDeleting || isReordering;

  const onImageDragEnd = async (event: DragEndEvent) => {
    try {
      await onDragEnd(event);
    } catch (err) {
      snackbar(t("imageReorderFailed"), { type: "warning" });
      console.error(err);
    }
  };

  const onFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) {
      return;
    }
    setIsUploading(true);
    const jobs: { jobId: string; jobStatus: string }[] = [];
    try {
      for (const file of files) {
        const { result } = await api.uploadFile(
          `manage/merch/${merch.id}/images`,
          [file],
          undefined,
          "POST"
        );
        jobs.push({ jobId: result.jobId, jobStatus: "waiting" });
      }
    } catch (err) {
      snackbar(t("imageUploadFailed"), { type: "warning" });
      console.error(err);
    }
    try {
      if (jobs.length > 0) {
        setUploadJobs(jobs);
        await reload();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (merchImageId: string) => {
    try {
      await deleteImage({ merchId: merch.id, merchImageId });
    } catch (err) {
      snackbar(t("imageDeleteFailed"), { type: "warning" });
      console.error(err);
    }
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-2">
      <h2 className="text-lg font-bold">{t("merchImages")}</h2>
      <p className="text-sm">{t("merchImagesDescription")}</p>
      <div className="grid grid-cols-2 gap-2">
        <DndContext sensors={sensors} onDragEnd={onImageDragEnd}>
          <SortableContext items={images}>
            {images.map((image, i) => (
              <SortableGridItem
                key={image.id}
                id={image.id}
                showHandle={images.length > 1}
                handleLabel={t("dragToReorderImage")}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded border border-(--mi-darken-x-background-color)">
                  {image.sizes?.[300] ? (
                    <img
                      src={image.sizes[300]}
                      alt={t("merchImageAlt", { number: i + 1 })}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Spinner />
                  )}
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-(--mi-black) px-1 text-xs text-(--mi-white)">
                      {t("primaryImage")}
                    </span>
                  )}
                  <ArtistButton
                    type="button"
                    size="compact"
                    variant="dashed"
                    onlyIcon
                    className="absolute bottom-2 right-2"
                    startIcon={<AiFillDelete />}
                    aria-label={t("deleteImage")}
                    disabled={isBusy || (isProcessing && !image.sizes?.[300])}
                    onClick={() => remove(image.id)}
                  />
                </div>
              </SortableGridItem>
            ))}
          </SortableContext>
        </DndContext>
        <div>
          <label
            htmlFor="merch-images-input"
            className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-(--mi-darken-x-background-color) text-sm"
          >
            <FaPlus />
            {t("addMerchImages")}
            {(isUploading || isProcessing) && <Spinner />}
          </label>
          <input
            id="merch-images-input"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={onFilesChosen}
            disabled={isUploading}
          />
        </div>
      </div>
      <small>
        {t("dimensionsTip", {
          keyPrefix: "artistForm",
          maxDimensions: "1500x1500",
          maxSize: "15mb",
        })}
      </small>
      <small className="opacity-70">
        {t("acceptedFormats", {
          keyPrefix: "manageAlbum",
          formats: formatAcceptList("image/*"),
        })}
      </small>
    </div>
  );
};

export default MerchImagesEditor;
