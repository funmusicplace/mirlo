import FormComponent from "components/common/FormComponent";
import React from "react";
import SavingInput from "./SavingInput";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";
import { FormSection } from "./AlbumFormContent";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";
import Button from "components/common/Button";
import { queryManagedTrackGroup, queryTrackGroupSupporters } from "queries";
import { useQuery } from "@tanstack/react-query";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

const FundraisingGoal: React.FC<{
  trackGroupId: number;
  fundraiser?: {
    id: number;
    goalAmount: number;
    isAllOrNothing: boolean;
    fundraiserStatus: string;
  } | null;
}> = ({ trackGroupId, fundraiser }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { watch } = useFormContext();
  const { artistId } = useParams();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const { data: trackGroup, refetch } = useQuery(
    queryManagedTrackGroup(trackGroupId)
  );

  const goal = watch("fundraisingGoal");
  const isAllOrNothing = watch("isAllOrNothing");

  const {
    data: { totalAmount } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroupId));

  const chargePledgesVisible =
    (isAllOrNothing && totalAmount > 0 && Number(goal) < totalAmount) ||
    (!isAllOrNothing && totalAmount > 0);

  const onChargePledges = async () => {
    try {
      setIsLoading(true);
      if (!fundraiser) {
        return;
      }
      await api.post(`manage/fundraisers/${fundraiser.id}/chargePledges`, {
        message: `Fundraiser successfully funded!`,
      });
      snackbar(t("chargePledgesSuccess"), { type: "success" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onMarkComplete = async () => {
    try {
      setIsLoading(true);
      if (!fundraiser) {
        return;
      }
      await api.put(`manage/fundraisers/${fundraiser.id}`, {
        fundraiserStatus: 'COMPLETE',
      });
      snackbar(t("markCompleteSuccess"), { type: "success" });
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddFundraiser = async () => {
    try {
      setIsLoading(true);

      await api.post(`manage/trackGroups/${trackGroupId}/fundraiser`, {});
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  console.log("trackGroup", fundraiser);

  if (!fundraiser) {
    return (
      <div>
        <h2>{t("addFundraiser")}</h2>
        <p>{t("addFundraiserDescription")}</p>
        <Button type="button" onClick={onAddFundraiser} isLoading={isLoading}>
          {t("addFundraiserToThisRelease")}
        </Button>
      </div>
    );
  }

  return (
    <FormSection>
      <div className="flex justify-between items-center w-full">
        <h2>{t("fundraisingGoal")}</h2>
        <div className="flex gap-2">
          {chargePledgesVisible && (
            <Button type="button" onClick={onChargePledges} isLoading={isLoading}>
              {t("chargePledges")}
            </Button>
          )}
          {fundraiser?.fundraiserStatus === 'FUNDING' && (
            <Button type="button" onClick={onMarkComplete} isLoading={isLoading}>
              {t("markComplete")}
            </Button>
          )}
        </div>
      </div>
      <p>{t("fundraisingGoalDescription")}</p>
      <div
        className={css`
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        `}
      >
        {/* <FormComponent>
          <label>{t("fundraisingEndDate")}</label>
          <SavingInput
            formKey="fundraisingEndDate"
            type="date"
            required
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
          />
        </FormComponent> */}
        <FormComponent>
          <label>{t("goal")}</label>
          <SavingInput
            formKey="goalAmount"
            url={`manage/fundraisers/${fundraiser.id}`}
            extraData={{ artistId: Number(artistId) }}
            type="number"
            multiplyBy100
            currency={user?.currency}
            step="0.01"
            min={0}
          />
        </FormComponent>
      </div>
      <FormComponent direction="row">
        <div>
          <SavingInput
            formKey="isAllOrNothing"
            id="isAllOrNothing"
            timer={0}
            url={`manage/fundraisers/${fundraiser.id}`}
            extraData={{ artistId: Number(artistId) }}
            type="checkbox"
          />
        </div>
        <div className="flex flex-col pl-2">
          <label htmlFor="isAllOrNothing">{t("isAllOrNothing")}</label>
          <small>{t("isAllOrNothingDescription")}</small>
        </div>
      </FormComponent>
    </FormSection>
  );
};

export default FundraisingGoal;
