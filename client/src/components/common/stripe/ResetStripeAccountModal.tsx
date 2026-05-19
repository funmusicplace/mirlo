import { useQuery, useQueryClient } from "@tanstack/react-query";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { queryUserStripeStatus } from "queries";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import Button from "../Button";

// User-facing recovery for the case where the Stripe account stored against
// the user has been deleted/disconnected out-of-band. Without resetting the
// stale id, every subsequent "Set up bank account" attempt bounces off Stripe
// with an opaque error. See #2085.
//
// Two-step 2FA flow per maintainer feedback on PR #2107:
//   1. Send a 6-digit code to the user's email (POST /resetCode)
//   2. User enters code + password to confirm (POST /reset)
const ResetStripeAccountModal: React.FC<{
  userId: number;
  userEmail: string;
  onReset: () => void;
}> = ({ userId, userEmail, onReset }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const snackbar = useSnackbar();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [codeSent, setCodeSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stripeAccountStatus, error: stripeError } = useQuery(
    queryUserStripeStatus(userId)
  );

  const isStripeGone =
    stripeError instanceof MirloFetchError && stripeError.status === 403;

  const close = React.useCallback(() => {
    setOpen(false);
    setPassword("");
    setCode("");
    setError(null);
    setCodeSent(false);
  }, []);

  const handleSendCode = React.useCallback(async () => {
    setError(null);
    setIsSendingCode(true);
    try {
      await api.post(`users/${userId}/stripe/resetCode`, {});
      setCodeSent(true);
      snackbar(t("stripeResetCodeSent", { email: userEmail }), {
        type: "success",
      });
    } catch (err) {
      setError(t("stripeResetCodeFailed"));
    } finally {
      setIsSendingCode(false);
    }
  }, [userId, userEmail, snackbar, t]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        await api.post(`users/${userId}/stripe/reset`, { password, code });
        snackbar(t("stripeAccountReset"), { type: "success" });
        onReset();
        close();
      } catch (err) {
        setError(t("stripeAccountResetFailed"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, password, code, snackbar, t, onReset, close]
  );

  if (!stripeAccountStatus?.stripeAccountId && !isStripeGone) {
    return null;
  }

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
        {!codeSent ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              {t("stripeResetStep1", { email: userEmail })}
            </p>
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
                disabled={isSendingCode}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                size="compact"
                onClick={handleSendCode}
                disabled={isSendingCode}
                isLoading={isSendingCode}
              >
                {t("stripeResetSendCode")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm">
              {t("stripeResetStep2", { email: userEmail })}
            </p>
            <FormComponent>
              <label htmlFor="reset-stripe-code">
                {t("verificationCodeLabel")}
              </label>
              <InputEl
                id="reset-stripe-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
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
                disabled={isSubmitting || !code || !password}
                isLoading={isSubmitting}
              >
                {t("resetStripeAccountConfirm")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};

export default ResetStripeAccountModal;
