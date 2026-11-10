import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FundraiserActions from "components/ManageArtist/Fundraisers/FundraiserActions";
import FundraiserFormFields from "components/ManageArtist/Fundraisers/FundraiserFormFields";
import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import {
  queryManagedTrackGroup,
  queryTrackGroupSupporters,
  useCreateFundraiserMutation,
} from "queries";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";

const FundraisingGoal: React.FC<{
  artistId: number;
  trackGroupId: number;
  fundraiser?: {
    id: number;
    goalAmount: number;
    isAllOrNothing: boolean;
    name?: string;
    description?: string | null;
    status?: "ACTIVE" | "SUCCESSFUL" | "FAILED";
  } | null;
}> = ({ artistId, trackGroupId, fundraiser }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { user } = useAuthContext();
  const { control } = useFormContext<TrackGroupFormData>();
  const platformPercent = useWatch({ control, name: "platformPercent" });
  const [didAddFundraiser, setDidAddFundraiser] = React.useState(false);
  const { mutateAsync: createFundraiser, isPending: isAdding } =
    useCreateFundraiserMutation();

  const { refetch } = useQuery(queryManagedTrackGroup(trackGroupId));

  const {
    data: { totalAmount, totalPledges } = {
      totalAmount: 0,
      totalPledges: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroupId));

  const onAddFundraiser = async () => {
    try {
      setDidAddFundraiser(true);
      await createFundraiser({ artistId, trackGroupId });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  if (!fundraiser) {
    return (
      <div className="flex flex-col items-start">
        <h2>{t("addFundraiser")}</h2>
        <small id="description-add-fundraiser">
          {t("addFundraiserDescription")}
        </small>
        <ArtistButton
          wrap
          type="button"
          onClick={onAddFundraiser}
          isLoading={isAdding}
          aria-describedby="description-add-fundraiser"
          className="mt-4"
        >
          {t("addFundraiserToThisRelease")}
        </ArtistButton>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center w-full">
        <h2>{t("fundraisingGoal")}</h2>
        {fundraiser.status === "SUCCESSFUL" && (
          <p className="text-sm text-(--mi-success-text-color) font-semibold">
            {t("fundraiserComplete")}
          </p>
        )}
        <FundraiserActions
          fundraiser={fundraiser}
          amountRaised={totalAmount}
          pledgeCount={totalPledges ?? 0}
          onChanged={refetch}
          onRemoved={() => {
            setDidAddFundraiser(false);
            refetch();
          }}
        />
      </div>
      <FundraiserFormFields
        artistId={artistId}
        currency={user?.currency}
        isAllOrNothing={fundraiser.isAllOrNothing}
        hasPledges={(totalPledges ?? 0) > 0}
        focusGoal={didAddFundraiser}
        platformPercent={platformPercent ? Number(platformPercent) : undefined}
      />
    </>
  );
};

export default FundraisingGoal;
