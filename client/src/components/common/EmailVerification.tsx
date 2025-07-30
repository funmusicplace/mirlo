import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input, InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useAuthContext } from "state/AuthContext";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Box from "components/common/Box";

const EmailVerification: React.FC<{
  setVerifiedEmail: (verifiedEmail: string) => void;
}> = ({ setVerifiedEmail }) => {
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const [code, setCode] = React.useState("");
  const [isLoading, setIsloading] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [waitingForVerification, setWaitingForVerification] =
    React.useState(false);
  const [email, setEmail] = React.useState(user?.email);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const verifyEmail = React.useCallback(async () => {
    try {
      setIsloading(true);
      const response = await api.post("verify-email", { email });
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
        }
      }
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsloading(false);
    }
  }, [code, email, snackbar, t]);

  if (emailVerified) {
    return null;
  }

  return (
    <>
      {waitingForVerification ? (
        <Box variant="info">
          {t("checkEmail")}
          <FormComponent>
            <label>{t("verificationCode")}</label>
            <InputEl
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </FormComponent>
          <ArtistButton
            type="button"
            isLoading={isLoading}
            onClick={verifyCode}
          >
            {t("verify")}
          </ArtistButton>
        </Box>
      ) : (
        <>
          <FormComponent>
            <label>{t("email")}</label>
            <Input
              name="email"
              type="email"
              value={email}
              required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
              }}
            />
          </FormComponent>
          <ArtistButton type="button" onClick={verifyEmail}>
            {t("verifyEmail")}
          </ArtistButton>
        </>
      )}
    </>
  );
};

export default EmailVerification;
