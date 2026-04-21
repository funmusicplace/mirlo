import FormComponent from "components/common/FormComponent";
import React from "react";
import SavingInput from "./SavingInput";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { useParams, Link } from "react-router-dom";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";
import Button, { ButtonLink } from "components/common/Button";
import { queryManagedTrackGroup, queryTrackGroupSupporters } from "queries";
import { useQuery } from "@tanstack/react-query";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { FaEye, FaTrash } from "react-icons/fa";

const FundraisingGoal: React.FC<{
  trackGroupId: number;
  fundraiser?: {
    id: number;
    goalAmount: number;
    isAllOrNothing: boolean;
  } | null;
}> = ({ trackGroupId, fundraiser }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { watch } = useFormContext();
  const { artistId } = useParams();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);
  const [didAddFundraiser, setDidAddFundraiser] = React.useState(false);

  const { data: trackGroup, refetch } = useQuery(
    queryManagedTrackGroup(trackGroupId)
  );

  const goal = watch("fundraisingGoal");
  const isAllOrNothing = watch("isAllOrNothing");

  const {
    data: { totalAmount, totalPledges } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
      totalPledges: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroupId));

  const hasPledges = (totalPledges ?? 0) > 0;

  const chargePledgesVisible =
    isAllOrNothing && totalAmount > 0 && Number(goal) < totalAmount;

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

  const onAddFundraiser = async () => {
    try {
      setIsLoading(true);
      setDidAddFundraiser(true);
      await api.post(`manage/trackGroups/${trackGroupId}/fundraiser`, {});
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRemoveFundraiser = async () => {
    try {
      setIsLoading(true);
      setDidAddFundraiser(false);
      if (!fundraiser) {
        return;
      }

      if (hasPledges) {
        const result = confirm(
          t("removingFundraiserWithPledgesWarning", {
            count: totalPledges ?? 0,
          })
        );
        if (!result) {
          return;
        }
      }
      await api.delete(`manage/trackGroups/${trackGroupId}/fundraiser`);
      snackbar(t("fundraiserRemoved"), {
        type: "success",
      });
      refetch();
    } catch (e) {
      console.error(e);
      snackbar(t("removalFailed"), {
        type: "warning",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goalRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    console.log(didAddFundraiser, goalRef);
    if (didAddFundraiser) {
      goalRef.current?.focus();
    }
  }, [didAddFundraiser, goalRef.current]);

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
    <>
      <div className="flex justify-between items-center w-full">
        <h2>{t("fundraisingGoal")}</h2>
        <div className="flex gap-2">
          {fundraiser.isAllOrNothing && (
            <ButtonLink
              to={`/manage/fundraiser/${fundraiser.id}/pledges`}
              className="flex items-center gap-1"
            >
              {t("viewPledges")}
            </ButtonLink>
          )}
          {chargePledgesVisible && (
            <Button
              type="button"
              onClick={onChargePledges}
              isLoading={isLoading}
            >
              {t("chargePledges")}
            </Button>
          )}
          {fundraiser && (
            <Button
              type="button"
              onClick={onRemoveFundraiser}
              isLoading={isLoading}
              startIcon={<FaTrash />}
            >
              {t(hasPledges ? "cancelFundraiser" : "removeFundraiser")}
            </Button>
          )}
        </div>
      </div>
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
          <label htmlFor="input-goal-amount">{t("goal")}</label>
          <SavingInput
            ariaDescribedBy="description-goal-amount"
            formKey="goalAmount"
            id="input-goal-amount"
            ref={goalRef}
            url={`manage/fundraisers/${fundraiser.id}`}
            extraData={{ artistId: Number(artistId) }}
            type="number"
            multiplyBy100
            currency={user?.currency}
            step="0.01"
            min={0}
          />
          <span className="text-sm" id="description-goal-amount">
            {t("fundraisingGoalDescription")}
          </span>
        </FormComponent>
      </div>
      <FormComponent direction="row">
        <div>
          <SavingInput
            ariaDescribedBy="description-all-or-nothing"
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
          <small id="description-all-or-nothing">
            {t("isAllOrNothingDescription")}
          </small>
        </div>
      </FormComponent>
    </>
  );
};

export default FundraisingGoal;
