import DraftRestoredBanner from "components/common/DraftRestoredBanner";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useFormPersist } from "utils/useFormPersist";

import AlbumFormContent from "./ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import { TrackGroupFormData } from "./ManageTrackGroup/ManageTrackGroup";

const buildDefaultValues = (trackGroup: TrackGroup): TrackGroupFormData => {
  const trackGroupIsGettable = trackGroup?.isGettable ?? false;
  return {
    ...trackGroup,
    releaseDate: trackGroup?.releaseDate?.split("T")[0] ?? "",
    catalogNumber: trackGroup?.catalogNumber ?? "",
    publishedAt: trackGroup?.publishedAt?.split("T")[0],
    platformPercent: `${trackGroup?.platformPercent ?? 7}`,
    isGettable: trackGroupIsGettable,
    minPrice: `${
      trackGroup?.minPrice !== undefined ? trackGroup.minPrice / 100 : ""
    }`,
    suggestedPrice:
      trackGroup?.suggestedPrice != null
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
  const methods = useForm<TrackGroupFormData>();

  React.useEffect(() => {
    methods.reset(buildDefaultValues(trackGroup), {
      keepDirtyValues: true,
      keepDirty: true,
    });
  }, [trackGroup]);

  const draftKey = trackGroup?.id ? `albumDraft-${trackGroup.id}` : null;
  const { hasRestoredDraft, clearDraft, discardDraft, dismissBanner } =
    useFormPersist(draftKey, methods);

  return (
    <div>
      <FormProvider {...methods}>
        {hasRestoredDraft && (
          <DraftRestoredBanner
            onDiscard={() => discardDraft(buildDefaultValues(trackGroup))}
            onKeep={dismissBanner}
          />
        )}
        <AlbumFormContent
          existingObject={trackGroup}
          reload={reload}
          onSaveSuccess={clearDraft}
        />
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
