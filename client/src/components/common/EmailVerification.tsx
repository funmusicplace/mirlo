import { useQueryClient } from "@tanstack/react-query";
import Box from "components/common/Box";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { Input, InputEl } from "components/common/Input";
import { QUERY_KEY_AUTH, queryKeyIncludes } from "queries/queryKeys";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

const EmailVerification: React.FC<{
  setVerifiedEmail: (verifiedEmail: string) => void;
  smallText?: string;
  contextSubject?: string;
}> = ({
  setVerifiedEmail,
  contextSubject,
  smallText = "emailVerificationInfo",
}) => {
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const [code, setCode] = React.useState("");
  const [isLoading, setIsloading] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [waitingForVerification, setWaitingForVerification] =
    React.useState(false);
  const [email, setEmail] = React.useState(user?.email);
  const queryClient = useQueryClient();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const verifyEmail = React.useCallback(async () => {
    try {
      setIsloading(true);
      await api.post("verify-email", { email, contextSubject });
      snackbar(t("emailVerificationSent"), { type: "success" });
      setWaitingForVerification(true);
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsloading(false);
    }
  }, [email, snackbar, t]);

  const verifyCode = React.useCallback(async () => {
    try {
      setIsloading(true);
      if (email) {
        const response = await api.post<
          { email: string; code: string },
          { userId: string }
        >("verify-email", {
          code,
          email,
        });
        if (response.userId) {
          setVerifiedEmail(email);
          snackbar(t("emailVerified"), { type: "success" });
          setEmailVerified(true);
          queryClient.invalidateQueries({
            predicate: (query) => queryKeyIncludes(query, QUERY_KEY_AUTH),
          });
        }
      }
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsloading(false);
    }
  }, [code, email, snackbar, t, queryClient, setVerifiedEmail]);

  if (emailVerified) {
    return null;
  }

  return (
    <>
      {waitingForVerification ? (
        <Box variant="info">
          <p className="text-sm mb-3">{t("checkEmail")}</p>
          <div className="flex flex-col gap-3">
            <FormComponent>
              <label htmlFor="input-verification-code">
                {t("verificationCode")}
              </label>
              <InputEl
                id="input-verification-code"
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </FormComponent>
            <Button type="button" isLoading={isLoading} onClick={verifyCode}>
              {t("verifyEmailCode")}
            </Button>
          </div>
        </Box>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          <FormComponent>
            <label htmlFor="input-email-verify">{t("email")}</label>
            <Input
              autoComplete="on"
              id="input-email-verify"
              name="email"
              type="email"
              value={email}
              required
              aria-describedby="hint-email-verify"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
              }}
            />
          </FormComponent>
          <Button type="button" isLoading={isLoading} onClick={verifyEmail}>
            {t("verifyEmail")}
          </Button>
          <small
            id="hint-email-verify"
            className="text-(--mi-light-foreground-color)"
          >
            {t(smallText)}
          </small>
        </div>
      )}
    </>
  );
};

export default EmailVerification;
