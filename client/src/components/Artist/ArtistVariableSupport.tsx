import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { isEmpty } from "lodash";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";

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
  const { refreshLoggedInUser } = useGlobalStateContext();
  const [open, setOpen] = React.useState(false);
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();
  const { refresh } = useArtistContext();

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
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refresh();
      refreshLoggedInUser();
    }
  };

  return (
    <>
      <SupportBoxButton
        variant="big"
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
            {tier.currency}
          </div>
          {tier.minAmount && formState.errors?.amount && (
            <small>
              {t("mustBeAtLeast", { minAmount: tier.minAmount / 100 })}
            </small>
          )}
          <SupportBoxButton
            isLoading={isCheckingForSubscription}
            disabled={isCheckingForSubscription || !isEmpty(formState.errors)}
            compact
            uppercase
            type="submit"
          >
            {t("letsSupport")}
          </SupportBoxButton>
        </form>
      </Modal>
    </>
  );
};

export default ArtistVariableSupport;
