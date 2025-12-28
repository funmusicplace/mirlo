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
import { queryTrackGroupSupporters } from "queries";
import { useQuery } from "@tanstack/react-query";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

const FundraisingGoal: React.FC<{ trackGroupId: number }> = ({
  trackGroupId,
}) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { watch } = useFormContext();
  const { artistId } = useParams();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);

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
      await api.post(`manage/trackGroups/${trackGroupId}/chargePledges`, {
        message: `Fundraiser successfully funded!`,
      });
      snackbar(t("chargePledgesSuccess"), { type: "success" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormSection>
      <div className="flex justify-between items-center w-full">
        <h2>{t("fundraisingGoal")}</h2>
        {chargePledgesVisible && (
          <Button type="button" onClick={onChargePledges} disabled={isLoading}>
            {t("chargePledges")}
          </Button>
        )}
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
            formKey="fundraisingGoal"
            url={`manage/trackGroups/${trackGroupId}`}
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
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
            type="checkbox"
          />
        </div>
        <label>{t("isAllOrNothing")}</label>
        <small>{t("isAllOrNothingDescription")}</small>
      </FormComponent>
    </FormSection>
  );
};

export default FundraisingGoal;
