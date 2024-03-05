import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import Box from "./common/Box";
import { Link } from "react-router-dom";
import FormComponent from "./common/FormComponent";
import Checkbox from "./common/FormCheckbox";
import styled from "@emotion/styled";
import WidthContainer from "./common/WidthContainer";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
  receiveMailingList: boolean;
  accountType: "listener";
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
    border: 1px solid var(--mi-darken-x-background-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    text-align: center;
    display: block;
    padding: 0.75rem;
    transition: 0.5s background-color;
    display: flex;
    align-items: center;
    height: 100%;
  }

  input:checked + span {
    background-color: var(--mi-info-background-color);
    color: var(--mi-white);
  }
`;

function Signup() {
  const { t } = useTranslation("translation", { keyPrefix: "signUp" });
  const snackbar = useSnackbar();
  const [hasRegistered, setHasRegistered] = React.useState(false);
  const methods = useForm<SignupInputs>({
    defaultValues: {
      accountType: "listener",
    },
  });
  const { register, handleSubmit } = methods;

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      try {
        await api.post(
          "signup",
          {
            ...data,
            receiveMailingList: !!data.receiveMailingList,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
          },
          {
            credentials: undefined,
          }
        );
        setHasRegistered(true);
        snackbar(t("success"), { type: "success" });
      } catch (e) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [snackbar, t]
  );

  if (hasRegistered) {
    return (
      <Box
        className={css`
          margin: 0 auto;
          max-width: 320px;
          text-align: center;
        `}
      >
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
            margin: 0 auto;
            display: flex;
            text-align: left;
            flex-direction: column;
          `}
          onSubmit={handleSubmit(onSubmit)}
        >
          <h2>{t("register")}</h2>
          <FormComponent>
            <label>{t("email")}</label>
            <InputEl type="email" {...register("email")} />
          </FormComponent>
          <FormComponent>
            <label>{t("password")}</label>
            <InputEl {...register("password")} type="password" />
          </FormComponent>

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
              <input type="radio" value="artist" {...register("accountType")} />
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

          <FormComponent>
            <Checkbox
              keyName="receiveMailingList"
              description={t("receiveMailingList")}
            />
          </FormComponent>
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
          src="/images/blackbird.png"
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
