import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import Button from "../Button";

// User-facing recovery for the case where the Stripe account stored against
// the user has been deleted/disconnected out-of-band. Without resetting the
// stale id, every subsequent "Set up bank account" attempt bounces off Stripe
// with an opaque error. See #2085.
const ResetStripeAccountModal: React.FC<{
  userId: number;
  userEmail: string;
  onReset: () => void;
}> = ({ userId, userEmail, onReset }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const snackbar = useSnackbar();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    setPassword("");
    setEmail("");
    setError(null);
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        await api.post(`users/${userId}/stripe/reset`, { password, email });
        snackbar(t("stripeAccountReset"), { type: "success" });
        onReset();
        close();
      } catch (err) {
        setError(t("stripeAccountResetFailed"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, password, email, snackbar, t, onReset, close]
  );

  return (
    <>
      <Button
        type="button"
        variant="dashed"
        size="compact"
        onClick={() => setOpen(true)}
      >
        {t("resetStripeAccount")}
      </Button>
      <Modal
        size="small"
        open={open}
        onClose={close}
        title={t("resetStripeAccount") ?? "Reset Stripe account"}
      >
        <p className="mb-4">{t("resetStripeAccountDescription")}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormComponent>
            <label htmlFor="reset-stripe-email">
              {t("confirmEmailLabel", { email: userEmail })}
            </label>
            <InputEl
              id="reset-stripe-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="reset-stripe-password">
              {t("confirmPasswordLabel")}
            </label>
            <InputEl
              id="reset-stripe-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </FormComponent>
          {error && (
            <p className="text-sm text-(--mi-red-700)" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="dashed"
              size="compact"
              onClick={close}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              size="compact"
              disabled={isSubmitting || !email || !password}
              isLoading={isSubmitting}
            >
              {t("resetStripeAccountConfirm")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

const StripeStatus = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const queryClient = useQueryClient();

  const userId = user?.id;

  const {
    data: stripeAccountStatus,
    isLoading: isLoadingStripe,
    isError: stripeStatusError,
  } = useQuery(queryUserStripeStatus(user?.id));

  if (isLoadingStripe) return <LoadingBlocks rows={2} height="2rem" />;

  const handleReset = () => {
    queryClient.invalidateQueries({ queryKey: ["fetchUserStripeStatus"] });
  };

  return (
    <div className="flex flex-col gap-4">
      <p>{t("manageStripeStatus")}</p>
      {stripeAccountStatus?.detailsSubmitted && (
        <Box variant="info">
          {!stripeAccountStatus?.chargesEnabled &&
            stripeAccountStatus?.detailsSubmitted &&
            t("waitingStripeAccountVerification")}
          {stripeAccountStatus?.chargesEnabled && (
            <Trans
              t={t}
              i18nKey="stripeAccountVerified"
              components={{ strong: <strong /> }}
            />
          )}
          {stripeAccountStatus?.defaultCurrency && (
            <p>
              <Trans
                t={t}
                i18nKey="payoutCurrency"
                values={{ currency: stripeAccountStatus.defaultCurrency }}
                components={{ strong: <strong /> }}
              />
            </p>
          )}
        </Box>
      )}
      {stripeStatusError && (
        <Box variant="warning">{t("stripeAccountUnreachable")}</Box>
      )}
      {userId && (
        <a href={api.paymentProcessor.stripeConnect(userId)}>
          <Button>
            {stripeAccountStatus?.detailsSubmitted
              ? t("updateBankAccount")
              : t("setUpBankAccount")}
          </Button>
        </a>
      )}
      {userId && user?.email && (
        <ResetStripeAccountModal
          userId={userId}
          userEmail={user.email}
          onReset={handleReset}
        />
      )}
      <p>
        <Trans
          t={t}
          i18nKey="payoutsInfo"
          components={{
            link: (
              <a
                href="https://docs.mirlo.space/payouts"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              ></a>
            ),
          }}
        />
      </p>
    </div>
  );
};

export default StripeStatus;
