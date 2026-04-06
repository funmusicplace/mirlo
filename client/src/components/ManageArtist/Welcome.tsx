import { Trans, useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import FormComponent from "components/common/FormComponent";
import FormCheckbox from "components/common/FormCheckbox";
import { InputEl } from "components/common/Input";
import { FormProvider, useForm } from "react-hook-form";
import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import ArtistSlugInput from "../common/SlugInput";
import api from "services/api";
import { FaArrowRight } from "react-icons/fa";
import { css } from "@emotion/css";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const PageWrapper = styled.div`
  padding: 2rem 0;
  max-width: 480px;
  margin: 0 auto;
`;

interface FormData {
  name: string;
  urlSlug: string;
  confirmContentPolicy: boolean;
}

const steps: ("name" | "urlSlug")[] = ["name", "urlSlug"];

const Welcome = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const userId = user?.id;
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [localArtist, setLocalArtist] = React.useState<Artist>();
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const methods = useForm<FormData>();
  const { register, handleSubmit, reset, formState, watch, getValues } =
    methods;
  const slugInputRef = React.useRef<HTMLInputElement>(null);

  const vals = {
    urlSlug: watch("urlSlug"),
    name: watch("name"),
    confirmContentPolicy: watch("confirmContentPolicy"),
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
          reset({
            name: response.result.name,
            urlSlug: response.result.urlSlug,
            confirmContentPolicy: true,
          });
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
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [
      vals.confirmContentPolicy,
      localArtist,
      localArtistLink,
      navigate,
      reset,
      step,
      userId,
    ]
  );

  const nameValue = watch("name");
  const contentPolicy = watch("confirmContentPolicy");

  React.useEffect(() => {
    if (step > 0) {
      slugInputRef.current?.focus();
    }
  }, [slugInputRef.current, step]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onClickNext)}>
        <PageWrapper>
          <h1>{t("welcome")}</h1>

          <FormComponent>
            <label htmlFor="input-name">{t("whatPublicName")}</label>
            <InputEl
              aria-describedby="hint-name"
              autoComplete="off"
              id="input-name"
              {...register("name")}
              placeholder={t("placeholderName") ?? ""}
              required
            />
            <small id="hint-name">{t("youCanChangeThis")}</small>
          </FormComponent>

          <FormComponent>
            <FormCheckbox
              keyName="confirmContentPolicy"
              description={
                <span>
                  <Trans
                    i18nKey="contentPolicyConfirmation"
                    t={t}
                    components={{
                      strong: <strong></strong>,
                      content: (
                        <Link
                          to="https://mirlo.space/pages/content-policy"
                          target="_blank"
                        ></Link>
                      ),
                    }}
                  />
                </span>
              }
              disabled={step > 0}
              required
            />
          </FormComponent>

          {step === 0 && (
            <Button
              isLoading={isLoading}
              type="submit"
              endIcon={<FaArrowRight />}
            >
              {t("next")}
            </Button>
          )}

          {step > 0 && (
            <FormComponent>
              <label htmlFor="input-slug">{t("showInTheURL")}</label>
              <small id="description-slug">
                <Trans
                  i18nKey="thisWillLookLikeURL"
                  t={t}
                  components={{
                    span: <span className="font-bold p-1 bg-gray-200"></span>,
                  }}
                  values={{
                    url: `${window.location.host}/${vals.urlSlug}`,
                  }}
                />
              </small>
              <ArtistSlugInput
                ariaDescribedBy="description-slug"
                id="input-slug"
                ref={slugInputRef}
                type="artist"
                currentArtistId={localArtist?.id}
              />
            </FormComponent>
          )}

          {step === 1 && (
            <Button
              isLoading={isLoading}
              type="submit"
              endIcon={<FaArrowRight />}
            >
              {t("customizeYourPage")}
            </Button>
          )}

          {step > 0 && (
            <ButtonLink
              to={localArtistLink}
              variant="outlined"
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
