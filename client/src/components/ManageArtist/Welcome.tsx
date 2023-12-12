import { useTranslation } from "react-i18next";
import { useGlobalStateContext } from "state/GlobalState";
import styled from "@emotion/styled";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { FormProvider, useForm } from "react-hook-form";
import Button from "components/common/Button";
import React from "react";
import ArtistSlugInput from "./ArtistSlugInput";
import api from "services/api";
import UploadArtistImage from "./UploadArtistImage";
import { FaArrowRight } from "react-icons/fa";
import { css } from "@emotion/css";
import { useNavigate } from "react-router-dom";

const PageWrapper = styled.div`
  padding: 1rem;
  max-width: 480px;
  margin: 0 auto;
`;

interface FormData {
  name: string;
  urlSlug: string;
}

const nextButtonText = (step: number, currentStepValue?: unknown) => {
  switch (steps[step]) {
    case "name":
      if (currentStepValue) {
        return "next";
      }
      return "enterANameToGetStarted";
    case "urlSlug":
      return "addAnAvatar";
    case "avatar":
      return "takeMeToTheArtistPage";
    default:
      return "next";
  }
};

const steps: ("name" | "urlSlug" | "avatar")[] = ["name", "urlSlug", "avatar"];

const Welcome = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const navigate = useNavigate();
  const userId = user?.id;
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [localArtist, setLocalArtist] = React.useState<Artist>();
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const methods = useForm<FormData>();
  const { register, handleSubmit, reset, formState, watch, getValues } =
    methods;

  const vals = { urlSlug: watch("urlSlug"), name: watch("name") };
  const localArtistLink = `/${localArtist?.urlSlug}`;

  const onClickNext = React.useCallback(
    async (data: FormData) => {
      setIsLoading(true);
      try {
        if (steps[step] === "name") {
          const response = await api.post<Partial<Artist>, { result: Artist }>(
            `users/${userId}/artists`,
            {
              name: data.name,
            }
          );
          setLocalArtist(response.result);
          reset(response.result);
        } else if (steps[step] === "avatar") {
          navigate(localArtistLink);
        } else if (localArtist && step > 1) {
          const response = await api.put<Partial<Artist>, { result: Artist }>(
            `users/${userId}/artists/${localArtist.id}`,
            data
          );

          setLocalArtist(response.result);
          reset(response.result);
        }
        setStep((s) => s + 1);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [localArtist, localArtistLink, navigate, reset, step, userId]
  );

  const currentStepValue = getValues(steps[step] as keyof FormData);

  const isButtonDisabled =
    !formState.isValid || vals[steps[step] as keyof FormData] === "";

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onClickNext)}>
        <PageWrapper>
          <h2>Welcome! Let's get you set up.</h2>

          <FormComponent>
            <label>First, what's the public name of your artist?</label>
            <InputEl {...register("name")} placeholder="name" />
          </FormComponent>

          {step > 0 && (
            <FormComponent>
              <label>What should we show in the URL?</label>
              <small>
                This will look like {window.location.host}/{vals.urlSlug}
              </small>
              <ArtistSlugInput currentArtistId={localArtist?.id} />
            </FormComponent>
          )}
          {step > 1 && localArtist && (
            <FormComponent>
              <label>Want to upload an avatar?</label>
              <UploadArtistImage
                existing={localArtist}
                imageType="avatar"
                height="150"
                width="150"
                maxDimensions="512x512"
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
              compact
              disabled={isButtonDisabled}
              type="submit"
              onClick={handleSubmit(onClickNext)}
              endIcon={<FaArrowRight />}
            >
              {t(nextButtonText(step, currentStepValue))}
            </Button>

            {step > 0 && steps[step] !== "avatar" && (
              <Button
                isLoading={isLoading}
                compact
                variant="outlined"
                disabled={isButtonDisabled}
                type="submit"
                onClick={() => {
                  navigate(localArtistLink);
                }}
                endIcon={<FaArrowRight />}
              >
                {t("takeMeToTheArtistPage")}
              </Button>
            )}
          </div>
        </PageWrapper>
      </form>
    </FormProvider>
  );
};

export default Welcome;
