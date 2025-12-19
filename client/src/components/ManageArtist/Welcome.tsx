import { Trans, useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { FormProvider, useForm } from "react-hook-form";
import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import ArtistSlugInput from "../common/SlugInput";
import api from "services/api";
import { FaArrowRight } from "react-icons/fa";
import { css } from "@emotion/css";
import { useNavigate } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

const PageWrapper = styled.div`
  padding: 2rem 0;
  max-width: 480px;
  margin: 0 auto;
`;

interface FormData {
  name: string;
  urlSlug: string;
  theme: string;
}

const nextButtonText = (step: number, currentStepValue?: unknown) => {
  switch (steps[step]) {
    case "name":
      if (currentStepValue) {
        return "next";
      }
      return "enterANameToGetStarted";
    case "urlSlug":
      return "customizeYourPage";

    default:
      return "next";
  }
};

const steps: ("name" | "urlSlug")[] = ["name", "urlSlug"];

const Welcome = () => {
  const { user } = useAuthContext();
  const errorHandler = useErrorHandler();
  const navigate = useNavigate();
  const userId = user?.id;
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [localArtist, setLocalArtist] = React.useState<Artist>();
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const methods = useForm<FormData>();
  const { register, handleSubmit, reset, formState, watch, getValues } =
    methods;

  const vals = {
    urlSlug: watch("urlSlug"),
    name: watch("name"),
    theme: watch("theme"),
  };
  const localArtistLink = `/${localArtist?.urlSlug}`;

  const onClickNext = React.useCallback(
    async (data: FormData) => {
      setIsLoading(true);
      try {
        if (steps[step] === "name") {
          const response = await api.post<Partial<Artist>, { result: Artist }>(
            `manage/artists`,
            {
              name: data.name,
              userId,
            }
          );
          setLocalArtist(response.result);
          reset(response.result);
        } else if (localArtist && step > 1) {
          const response = await api.put<Partial<Artist>, { result: Artist }>(
            `manage/artists/${localArtist.id}`,
            data
          );

          setLocalArtist(response.result);
          reset(response.result);
        }
        if (localArtist && steps[step] === "urlSlug") {
          navigate(`/manage/artists/${localArtist.id}/customize`);
        } else {
          setStep((s) => s + 1);
        }
      } catch (e) {
        errorHandler(e);
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [errorHandler, localArtist, localArtistLink, navigate, reset, step, userId]
  );

  const currentStepValue = getValues(steps[step] as keyof FormData);

  const isButtonDisabled =
    !formState.isValid || vals[steps[step] as keyof FormData] === "";

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onClickNext)}>
        <PageWrapper>
          <h2>{t("welcome")}</h2>

          <FormComponent>
            <label>{t("whatPublicName")}</label>
            <InputEl
              {...register("name")}
              placeholder={t("placeholderName") ?? ""}
            />
            <small>{t("youCanChangeThis")}</small>
          </FormComponent>

          {step > 0 && (
            <FormComponent>
              <label>{t("showInTheURL")}</label>
              <small>
                <Trans
                  i18nKey="thisWillLookLikeURL"
                  t={t}
                  components={{
                    strong: <strong></strong>,
                  }}
                  values={{
                    url: `${window.location.host}/${vals.urlSlug}`,
                  }}
                />
              </small>
              <ArtistSlugInput
                type="artist"
                currentArtistId={localArtist?.id}
              />
            </FormComponent>
          )}

          <div
            className={css`
              display: flex;

              button {
                margin-right: 1rem;
              }
            `}
          >
            <Button
              isLoading={isLoading}
              size="compact"
              disabled={isButtonDisabled}
              type="submit"
              onClick={handleSubmit(onClickNext)}
              endIcon={<FaArrowRight />}
            >
              {t(nextButtonText(step, currentStepValue))}
            </Button>
          </div>
          {step > 0 && (
            <ButtonLink
              to={localArtistLink}
              isLoading={isLoading}
              variant="outlined"
              disabled={isButtonDisabled}
              endIcon={<FaArrowRight />}
              className={css`
                margin-top: 1rem;
              `}
            >
              {t("takeMeToTheArtistPage")}
            </ButtonLink>
          )}
        </PageWrapper>
      </form>
    </FormProvider>
  );
};

export default Welcome;
