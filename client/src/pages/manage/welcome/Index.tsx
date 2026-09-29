import styled from "@emotion/styled";
import Button from "components/common/Button";
import FormCheckbox from "components/common/FormCheckbox";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import WelcomeUrlSlugStep from "components/ManageArtist/Welcome/WelcomeUrlSlugStep";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
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

function Index() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const userId = user?.id;
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [localArtist, setLocalArtist] = React.useState<Artist>();
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const methods = useForm<FormData>();
  const { register, handleSubmit, reset } = methods;

  const saveArtist = React.useCallback(
    async (artist: Artist, data: FormData) => {
      const response = await api.put<Partial<Artist>, { result: Artist }>(
        `manage/artists/${artist.id}`,
        { name: data.name, urlSlug: data.urlSlug }
      );
      setLocalArtist(response.result);
      return response.result;
    },
    []
  );

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
          setStep((s) => s + 1);
        } else if (localArtist && steps[step] === "urlSlug") {
          await saveArtist(localArtist, data);
          navigate(`/manage/artists/${localArtist.id}/customize`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [localArtist, navigate, reset, saveArtist, step, userId]
  );

  const onGoToArtistPage = handleSubmit(async (data: FormData) => {
    if (!localArtist) return;
    setIsLoading(true);
    try {
      const saved = await saveArtist(localArtist, data);
      navigate(`/${saved.urlSlug}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  });

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

          {steps[step] === "urlSlug" && (
            <WelcomeUrlSlugStep
              artistId={localArtist?.id}
              isLoading={isLoading}
              onGoToArtistPage={onGoToArtistPage}
            />
          )}
        </PageWrapper>
      </form>
    </FormProvider>
  );
}

export default Index;
