import {
  useDeleteMerchImageMutation,
  useReorderMerchImagesMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import SortableImagesEditor from "../SortableImagesEditor";

const MerchImagesEditor: React.FC<{
  merch: Merch;
  reload: () => unknown;
}> = ({ merch, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const { mutateAsync: deleteImage, isPending: isDeleting } =
    useDeleteMerchImageMutation();
  const { mutateAsync: reorderImages, isPending: isReordering } =
    useReorderMerchImagesMutation();

  return (
    <SortableImagesEditor
      images={merch.images}
      uploadUrl={`manage/merch/${merch.id}/images`}
      inputId="merch-images-input"
      reload={reload}
      onReorder={(merchImageIds) =>
        reorderImages({ merchId: merch.id, merchImageIds })
      }
      onDelete={(merchImageId) =>
        deleteImage({ merchId: merch.id, merchImageId })
      }
      isPending={isDeleting || isReordering}
      labels={{
        title: t("merchImages"),
        description: t("merchImagesDescription"),
        add: t("addMerchImages"),
        first: t("primaryImage"),
        imageAlt: (number) => t("merchImageAlt", { number }),
        deleteImage: t("deleteImage"),
        dragToReorder: t("dragToReorderImage"),
        uploadFailed: t("imageUploadFailed"),
        deleteFailed: t("imageDeleteFailed"),
        reorderFailed: t("imageReorderFailed"),
      }}
    />
  );
};

export default MerchImagesEditor;
