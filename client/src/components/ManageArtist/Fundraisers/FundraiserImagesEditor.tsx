import {
  useDeleteFundraiserImageMutation,
  useInvalidateFundraisers,
  useReorderFundraiserImagesMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import SortableImagesEditor from "../SortableImagesEditor";

const FundraiserImagesEditor: React.FC<{
  fundraiser: ManagedFundraiser;
}> = ({ fundraiser }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const invalidate = useInvalidateFundraisers();
  const { mutateAsync: deleteImage, isPending: isDeleting } =
    useDeleteFundraiserImageMutation();
  const { mutateAsync: reorderImages, isPending: isReordering } =
    useReorderFundraiserImagesMutation();

  return (
    <SortableImagesEditor
      images={fundraiser.images}
      uploadUrl={`manage/fundraisers/${fundraiser.id}/images`}
      inputId="fundraiser-images-input"
      reload={invalidate}
      onReorder={(fundraiserImageIds) =>
        reorderImages({ fundraiserId: fundraiser.id, fundraiserImageIds })
      }
      onDelete={(fundraiserImageId) =>
        deleteImage({ fundraiserId: fundraiser.id, fundraiserImageId })
      }
      isPending={isDeleting || isReordering}
      labels={{
        title: t("images"),
        description: t("imagesDescription"),
        add: t("addImages"),
        first: t("coverImage"),
        imageAlt: (number) => t("imageAlt", { number }),
        deleteImage: t("deleteImage"),
        dragToReorder: t("dragToReorderImage"),
        uploadFailed: t("imageUploadFailed"),
        deleteFailed: t("imageDeleteFailed"),
        reorderFailed: t("imageReorderFailed"),
      }}
    />
  );
};

export default FundraiserImagesEditor;
