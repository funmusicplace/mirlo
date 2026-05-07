import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import AlbumFormContent from "./ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import { TrackGroupFormData } from "./ManageTrackGroup/ManageTrackGroup";

const AlbumForm: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
  reload: () => Promise<unknown>;
}> = ({ trackGroup, reload }) => {
  const methods = useForm<TrackGroupFormData>();

  React.useEffect(() => {
    const trackGroupIsGettable = trackGroup?.isGettable ?? false;
    const defaultValues = {
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
      endDate: `${
        trackGroup?.fundraiser?.endDate
          ? trackGroup.fundraiser.endDate.split("T")[0]
          : ""
      }`,
    };
    methods.reset(defaultValues, { keepDirtyValues: true });
  }, [trackGroup]);

  return (
    <div>
      <FormProvider {...methods}>
        <AlbumFormContent existingObject={trackGroup} reload={reload} />
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
