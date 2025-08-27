import FormComponent from "components/common/FormComponent";
import React from "react";
import SavingInput from "./SavingInput";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";
import { FormSection } from "./AlbumFormContent";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";

const FundraisingGoal: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const {
    formState: { errors },
  } = useFormContext();
  const { artistId, trackGroupId } = useParams();
  const { user } = useAuthContext();
  return (
    <FormSection>
      <h2>{t("fundraisingGoal")}</h2>
      <p>{t("fundraisingGoalDescription")}</p>
      <div
        className={css`
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        `}
      >
        <FormComponent>
          <label>{t("fundraisingEndDate")}</label>
          <SavingInput
            formKey="fundraisingEndDate"
            type="date"
            required
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
          />
        </FormComponent>
        <FormComponent>
          <label>{t("goal")}</label>
          <SavingInput
            formKey="fundraisingGoal"
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
            type="number"
            currency={user?.currency}
            step="0.01"
            min={0}
          />
        </FormComponent>
      </div>
    </FormSection>
  );
};

export default FundraisingGoal;
