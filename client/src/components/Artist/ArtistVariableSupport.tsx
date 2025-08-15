import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { isEmpty } from "lodash";
import { queryArtist } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { useGetArtistColors } from "./ArtistButtons";
import useErrorHandler from "services/useErrorHandler";

export const SupportBoxButton = styled(Button)`
  white-space: normal !important;
  margin-top: 1rem;
  padding: 0.5rem 0.5rem;
`;

const ArtistVariableSupport: React.FC<{
  tier: ArtistSubscriptionTier;
}> = ({ tier }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { handleSubmit, register, formState, getValues } = useForm({
    defaultValues: {
      amount: tier.minAmount ? tier.minAmount / 100 : 0,
    },
  });
  const { refreshLoggedInUser } = useAuthContext();
  const [open, setOpen] = React.useState(false);
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();
  const { artistId } = useParams();
  const { refetch: refresh } = useQuery(queryArtist({ artistSlug: artistId }));
  const errorHandler = useErrorHandler();

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    try {
      setIsCheckingForSubscription(true);
      const response = await api.post<
        { tierId: number; amount?: number },
        { sessionUrl: string }
      >(`artists/${tier.artistId}/subscribe`, {
        tierId: tier.id,
        amount: tier.allowVariable ? getValues("amount") * 100 : tier.minAmount,
      });
      window.location.assign(response.sessionUrl);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsCheckingForSubscription(false);
      refresh();
      refreshLoggedInUser();
    }
  };

  return (
    <>
      <SupportBoxButton
        size="big"
        rounded
        uppercase
        onClick={() =>
          tier.allowVariable ? setOpen(true) : subscribeToTier(tier)
        }
        isLoading={isCheckingForSubscription}
        disabled={isCheckingForSubscription}
        className={css`
          width: 100%;
        `}
      >
        {t("support")}
      </SupportBoxButton>
      <Modal
        size="small"
        open={open}
        onClose={() => setOpen(false)}
        title={t("howMuch") ?? ""}
      >
        <form onSubmit={handleSubmit(() => subscribeToTier(tier))}>
          <p>{tier.description}</p>
          <div
            className={css`
              display: flex;
              align-items: center;
              margin-bottom: 1rem;
              margin-top: 1rem;

              input {
                margin-right: 1rem;
              }
            `}
          >
            <InputEl
              {...register("amount", {
                min: tier.minAmount ? tier.minAmount / 100 : undefined,
                required: true,
              })}
            />
            {tier.currency}{" "}
            {t(tier.interval === "MONTH" ? "monthly" : "yearly")}
            {!!tier.minAmount && formState.errors?.amount && (
              <small>
                {t("mustBeAtLeast", { minAmount: tier.minAmount / 100 })}
              </small>
            )}
          </div>

          <div
            className={css`
              width: 100%;
              padding: 0.5rem 0m;
            `}
          >
            {t("includesNewReleasesLong")}
          </div>

          <SupportBoxButton
            isLoading={isCheckingForSubscription}
            disabled={isCheckingForSubscription || !isEmpty(formState.errors)}
            size="compact"
            uppercase
            type="submit"
          >
            {t("letsSupport")}
          </SupportBoxButton>
          <div
            className={css`
              margin-top: 1rem;

              small {
                display: block;
                margin-bottom: 0.5rem;
              }
            `}
          >
            <small>{t("artistCheckoutPage")}</small>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ArtistVariableSupport;
