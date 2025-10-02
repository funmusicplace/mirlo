import { css } from "@emotion/css";
import Button, { ButtonLink } from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";

import { Turnstile } from "@marsidev/react-turnstile";
import TextArea from "components/common/TextArea";
import { useSnackbar } from "state/SnackbarContext";
import { ArtistButton } from "components/Artist/ArtistButtons";

const FlagContent: React.FC<{ trackGroupId: number; onlyIcon?: boolean }> = ({
  trackGroupId,
  onlyIcon,
}) => {
  const [isFlagOpen, setIsFlagOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useForm({
    defaultValues: {
      reason: "copyrightViolation",
      email: "",
      description: "",
    },
  });

  const submitFlag = async (data: { reason: string; email: string }) => {
    setIsLoading(true);

    try {
      // @ts-ignore
      const cfTurnstile = turnstile.getResponse();
      await api.post(`flag`, { ...data, cfTurnstile, trackGroupId });
      setIsLoading(false);
      setIsFlagOpen(false);
      snackbar(
        "Successfully reported a problem with this content. We will investigate it.",
        {
          type: "success",
        }
      );
    } catch (e) {
      setIsLoading(false);
      snackbar("An error happened while reporting this content", {
        type: "warning",
      });
      console.error(e);
    }
  };

  return (
    <>
      <ArtistButton
        onlyIcon={onlyIcon}
        aria-label={t("flagContent") ?? undefined}
        variant="link"
        className={css`
          font-weight: normal !important;
          font-size: 0.9rem !important;
          margin-right: 1.25rem;
        `}
        onClick={() => setIsFlagOpen(true)}
      >
        {t("flagContent")}
      </ArtistButton>
      <Modal
        size="small"
        open={isFlagOpen}
        onClose={() => setIsFlagOpen(false)}
        title={t("flagContent") ?? ""}
      >
        <p
          className={css`
            margin-bottom: 1rem;
          `}
        >
          {t("reportContentDescription")}
        </p>
        <form onSubmit={methods.handleSubmit(submitFlag)} id="flag-form">
          <FormComponent>
            <label>{t("whyAreYouFlaggingIt")}</label>
            <SelectEl {...methods.register("reason")}>
              <option value="copyrightViolation">Copyright violation</option>
              <option value="inappropriateContent">
                Inappropriate content
              </option>
            </SelectEl>
          </FormComponent>
          <FormComponent>
            <TextArea required {...methods.register("description")} />
          </FormComponent>
          <FormComponent>
            <label>{t("howContact")} </label>

            <InputEl required {...methods.register("email")} />
          </FormComponent>
          <Turnstile siteKey={import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY} />

          <Button isLoading={isLoading} type="submit" disabled={isLoading}>
            {t("report")}
          </Button>
        </form>
      </Modal>
    </>
  );
};

export default FlagContent;
