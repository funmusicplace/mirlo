import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import Box from "./common/Box";
import { Link, useSearchParams } from "react-router-dom";
import FormComponent from "./common/FormComponent";
import Checkbox from "./common/FormCheckbox";
import styled from "@emotion/styled";
import WidthContainer from "./common/WidthContainer";
import useErrorHandler from "services/useErrorHandler";
import { useQuery } from "@tanstack/react-query";
import { querySetting } from "queries/settings";
import Lottie from "lottie-react";

import checkmark from "../animations/lotties/checkmark.json";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
  receiveMailingList: boolean;
  emailInvited: string;
  accountType: "listener" | "artist";
  promoCode: string;
  inviteToken: string;
};

const ArtistToggle = styled(FormComponent)`
  margin-top: 0rem;
  display: flex;
  flex-direction: row;
  align-items: stretch;

  input {
    display: none;
  }

  label {
    width: 50%;
    margin: 0 0.5rem 0 0;
    border: 1px solid var(--mi-lighten-x-background-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  input:checked + span {
    background: var(--mi-info-background-color);
  }

  span {
    text-align: center;
    display: block;
    padding: 0.75rem;
    transition: 0.5s background-color;
    display: flex;
    align-items: center;
    height: 100%;
    cursor: pointer;
  }
`;

function Signup() {
  const { t } = useTranslation("translation", { keyPrefix: "signUp" });
  const [search] = useSearchParams();
  const snackbar = useSnackbar();
  const { data: isClosedToPublicArtistSignup, isFetching } = useQuery(
    querySetting("isClosedToPublicArtistSignup")
  );
  const errorHandler = useErrorHandler();
  const invitedBy = search.get("invitedBy");
  const accountType = search.get("accountType");
  const [hasRegistered, setHasRegistered] = React.useState(false);
  const [accountIncomplete, setAccountIncomplete] = React.useState(false);
  const methods = useForm<SignupInputs>({
    defaultValues: {
      email: search.get("email") ?? "",
      inviteToken: search.get("inviteToken") ?? "",
      accountType: accountType === "artist" ? "artist" : "listener",
      promoCode: search.get("promo") ?? "",
      emailInvited: search.get("email") ?? "",
    },
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit } = methods;

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      setIsLoading(true);
      try {
        await api.post(
          "signup",
          {
            ...data,
            receiveMailingList: !!data.receiveMailingList,
            client: import.meta.env.VITE_CLIENT_DOMAIN,
          },
          {
            credentials: undefined,
          }
        );
        setHasRegistered(true);
        snackbar(t("success"), { type: "success" });
      } catch (e) {
        if ((e as Error).message.includes("incomplete")) {
          await api.post("password-reset/initiate", {
            ...data,
            accountIncomplete: true,
            redirectClient:
              import.meta.env.VITE_CLIENT_DOMAIN + "/password-reset",
          });
          snackbar(t("checkEmailContinueSignup"), {
            type: "success",
          });
          setAccountIncomplete(true);
          setHasRegistered(true);
        } else {
          errorHandler(e);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [snackbar, t]
  );

  if (accountIncomplete) {
    return (
      <Box
        className={css`
          margin: 0 auto;
          max-width: 320px;
          text-align: center;
        `}
      >
        {t("accountIncomplete")}
      </Box>
    );
  }

  if (hasRegistered) {
    return (
      <Box
        className={css`
          margin: 2rem auto;
          max-width: 320px;
          text-align: center;
          font-size: 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 1rem;
        `}
      >
        <Lottie
          animationData={checkmark}
          loop={false}
          width={100}
          style={{ width: 100, height: 100 }}
          height={100}
        />
        {t("hasRegistered")}
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <WidthContainer variant="small">
        <form
          className={css`
            max-width: 320px;
            margin: 2rem auto;
            display: flex;
            text-align: left;
            flex-direction: column;
          `}
          onSubmit={handleSubmit(onSubmit)}
        >
          <h2>{t("register")}</h2>
          {invitedBy && (
            <Box
              className={css`
                margin: 0 auto;
                max-width: 320px;
                text-align: center;
              `}
              variant="info"
            >
              {t(
                accountType === "artist"
                  ? "invitedByAsArtist"
                  : "invitedByAsListener",
                {
                  name: invitedBy,
                }
              )}
            </Box>
          )}
          <FormComponent>
            <label>{t("email")}</label>
            <InputEl type="email" {...register("email")} />
          </FormComponent>
          <FormComponent>
            <label>{t("password")}</label>
            <InputEl {...register("password")} type="password" />
          </FormComponent>

          {!isClosedToPublicArtistSignup && !isFetching && (
            <>
              <div
                className={css`
                  margin-bottom: 1rem;
                `}
              >
                <strong>{t("howUse")}</strong>
              </div>

              <ArtistToggle>
                <label>
                  <input
                    type="radio"
                    value="listener"
                    {...register("accountType")}
                  />
                  <span>{t("imJustHereToListen")}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="artist"
                    {...register("accountType")}
                  />
                  <span>{t("shareMyMusic")}</span>
                </label>
              </ArtistToggle>

              <small
                className={css`
                  margin-bottom: 1rem;
                `}
              >
                {t("alwaysCreateLater")}
              </small>
            </>
          )}

          <FormComponent>
            <Checkbox
              keyName="receiveMailingList"
              description={t("receiveMailingList")}
            />
          </FormComponent>
          <InputEl type="hidden" {...register("promoCode")} />
          <InputEl type="hidden" {...register("inviteToken")} />
          <InputEl type="hidden" {...register("emailInvited")} />

          <div
            className={css`
              margin-bottom: 0.5rem;
            `}
          >
            <Trans
              t={t}
              i18nKey="termsAndPrivacy"
              components={{
                terms: <Link to="/pages/terms"></Link>,
                privacy: <Link to="/pages/privacy"></Link>,
                cookie: <Link to="/pages/cookie-policy"></Link>,
              }}
            />{" "}
          </div>
          <Button
            className={css`
              margin-top: 1rem;
            `}
            type="submit"
            isLoading={isLoading}
          >
            {t("signUpButton")}
          </Button>
        </form>
        <Link
          to="/login"
          className={css`
            margin: 0 auto;
            display: inline-block;
            margin-top: 1rem;
          `}
        >
          {t("logIn")}
        </Link>
        <img
          alt="a blackbird"
          src="/static/images/blackbird.png"
          className={css`
            width: 100%;
            padding: 4rem 0;
          `}
        />
      </WidthContainer>
    </FormProvider>
  );
}

export default Signup;
