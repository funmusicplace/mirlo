import DraftRestoredBanner from "components/common/DraftRestoredBanner";
import { RestoredFieldsProvider } from "components/common/RestoredFields";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useFormPersist } from "utils/useFormPersist";

import AlbumFormContent from "./ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import { TrackGroupFormData } from "pages/manage/artists/:artistId/release/:trackGroupId/Index";

const buildDefaultValues = (trackGroup: TrackGroup): TrackGroupFormData => {
  const trackGroupIsGettable = trackGroup?.isGettable ?? false;
  return {
    ...trackGroup,
    releaseDate: trackGroup?.releaseDate?.split("T")[0] ?? "",
    catalogNumber: trackGroup?.catalogNumber ?? "",
    coverImageAlt: trackGroup?.coverImageAlt ?? "",
    publishedAt: trackGroup?.publishedAt?.split("T")[0],
    platformPercent: `${trackGroup?.platformPercent ?? 7}`,
    isGettable: trackGroupIsGettable,
    minPrice: `${
      trackGroup?.minPrice !== undefined ? trackGroup.minPrice / 100 : ""
    }`,
    suggestedPrice:
      trackGroup?.suggestedPrice !== undefined
        ? `${trackGroup.suggestedPrice / 100}`
        : "",
    goalAmount: `${
      trackGroup?.fundraiser?.goalAmount
        ? trackGroup.fundraiser.goalAmount / 100
        : ""
    }`,
    isAllOrNothing: trackGroup?.fundraiser?.isAllOrNothing ?? false,
  } as unknown as TrackGroupFormData;
};

const AlbumForm: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
  reload: () => Promise<unknown>;
}> = ({ trackGroup, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<TrackGroupFormData>({
    defaultValues: buildDefaultValues(trackGroup),
  });

  const { reset } = methods;

  React.useEffect(() => {
    reset(buildDefaultValues(trackGroup), {
      keepDirtyValues: true,
      keepDirty: true,
    });
  }, [trackGroup]);

  const draftKey = trackGroup?.id ? `albumDraft-${trackGroup.id}` : null;
  const {
    hasRestoredDraft,
    restoredFields,
    clearDraft,
    discardDraft,
    dismissBanner,
  } = useFormPersist(draftKey, methods);

  const fieldLabelMap = React.useMemo<Record<string, string>>(
    () => ({
      title: t("title"),
      urlSlug: t("urlSlug"),
      releaseDate: t("releaseDate"),
      catalogNumber: t("catalogNumber"),
      coverImageAlt: t("coverImageAlt"),
      about: t("about"),
      credits: t("credits"),
      minPrice: t("minimumPrice"),
      suggestedPrice: t("suggestedPrice"),
    }),
    [t]
  );
  const restoredLabels = restoredFields
    .map((f) => fieldLabelMap[f])
    .filter(Boolean);

  return (
    <div>
      <FormProvider {...methods}>
        <RestoredFieldsProvider fields={restoredFields}>
          {hasRestoredDraft && (
            <DraftRestoredBanner
              onDiscard={() => discardDraft(buildDefaultValues(trackGroup))}
              onKeep={dismissBanner}
              fieldLabels={restoredLabels}
            />
          )}
          <AlbumFormContent
            existingObject={trackGroup}
            reload={reload}
            onSaveSuccess={clearDraft}
          />
        </RestoredFieldsProvider>
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
