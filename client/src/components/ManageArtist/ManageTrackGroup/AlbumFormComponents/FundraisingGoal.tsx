import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { getCurrencySymbol } from "components/common/Money";
import { queryManagedTrackGroup, queryTrackGroupSupporters } from "queries";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import { TrackGroupFormData } from "../ManageTrackGroup";

const FundraisingGoal: React.FC<{
  trackGroupId: number;
  fundraiser?: {
    id: number;
    goalAmount: number;
    isAllOrNothing: boolean;
    status?: "ACTIVE" | "SUCCESSFUL" | "FAILED";
  } | null;
}> = ({ trackGroupId, fundraiser }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, watch } = useFormContext<TrackGroupFormData>();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);
  const [didAddFundraiser, setDidAddFundraiser] = React.useState(false);

  const { data: trackGroup, refetch } = useQuery(
    queryManagedTrackGroup(trackGroupId)
  );

  const goal = watch("goalAmount");
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

  const isFundraiserComplete = fundraiser?.status === "SUCCESSFUL";
  const chargePledgesVisible =
    !isFundraiserComplete &&
    (!isAllOrNothing || (totalAmount > 0 && Number(goal) < totalAmount));

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

  const goalRef = React.useRef<HTMLInputElement | null>(null);
  const { ref: goalRegisterRef, ...goalRegisterRest } = register("goalAmount", {
    min: 0,
  });
  const setGoalRef = (el: HTMLInputElement | null) => {
    goalRegisterRef(el);
    goalRef.current = el;
  };

  React.useEffect(() => {
    if (didAddFundraiser) {
      goalRef.current?.focus();
    }
  }, [didAddFundraiser, goalRef.current]);

  if (!fundraiser) {
    return (
      <div className="flex flex-col items-start">
        <h2>{t("addFundraiser")}</h2>
        <small id="description-add-fundraiser">
          {t("addFundraiserDescription")}
        </small>
        <ArtistButton
          type="button"
          onClick={onAddFundraiser}
          isLoading={isLoading}
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
        {isFundraiserComplete && (
          <p className="text-sm text-(--mi-success-text-color) font-semibold">
            {t("fundraiserComplete")}
          </p>
        )}
        <div className="flex gap-2">
          {fundraiser.isAllOrNothing && (
            <ArtistButtonLink
              to={`/manage/fundraiser/${fundraiser.id}/pledges`}
              className="flex items-center gap-1"
            >
              {t("viewPledges")}
            </ArtistButtonLink>
          )}
          {chargePledgesVisible && (
            <ArtistButton
              type="button"
              onClick={onChargePledges}
              isLoading={isLoading}
            >
              {t(isAllOrNothing ? "chargePledges" : "markFundraiserDone")}
            </ArtistButton>
          )}
          {fundraiser && (
            <ArtistButton
              type="button"
              onClick={onRemoveFundraiser}
              isLoading={isLoading}
              startIcon={<FaTrash />}
            >
              {t(hasPledges ? "cancelFundraiser" : "removeFundraiser")}
            </ArtistButton>
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
          <div className="flex items-center gap-2">
            {user?.currency && (
              <span className="ml-1">{getCurrencySymbol(user.currency)}</span>
            )}
            <InputEl
              aria-describedby="description-goal-amount"
              id="input-goal-amount"
              type="number"
              step="0.01"
              min={0}
              {...goalRegisterRest}
              ref={setGoalRef}
            />
          </div>
          <span className="text-sm" id="description-goal-amount">
            {t("fundraisingGoalDescription")}
          </span>
        </FormComponent>
      </div>
      <FormComponent direction="row">
        <div>
          <InputEl
            aria-describedby="description-all-or-nothing"
            id="isAllOrNothing"
            type="checkbox"
            {...register("isAllOrNothing")}
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
