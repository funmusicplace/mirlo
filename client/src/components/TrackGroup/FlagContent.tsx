import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import { useSpamChallenge } from "components/common/SpamChallenge";
import TextArea from "components/common/TextArea";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

const FlagContent: React.FC<{ trackGroupId: number; onlyIcon?: boolean }> = ({
  trackGroupId,
  onlyIcon,
}) => {
  const [isFlagOpen, setIsFlagOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const {
    challenge: spamChallenge,
    token: cfTurnstile,
    reset: resetSpamChallenge,
  } = useSpamChallenge();
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
      await api.post(`flag`, {
        ...data,
        cfTurnstile: cfTurnstile.current,
        trackGroupId,
      });
      setIsLoading(false);
      setIsFlagOpen(false);
      snackbar(
        "Successfully reported a problem with this content. We will investigate it.",
        {
          type: "success",
        }
      );
    } catch (e) {
      resetSpamChallenge();
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
          font-size: 0.75rem !important;
          color: var(--mi-light-foreground-color) !important;
          text-decoration: none !important;

          &:hover {
            text-decoration: underline !important;
          }

          @media screen and (max-width: ${bp.medium}px) {
            max-width: 100%;
            margin: var(--mi-side-paddings-xsmall);
          }
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
              <option value="copyrightViolation">
                {t("copyrightViolation")}
              </option>
              <option value="inappropriateContent">
                {t("inappropriateContent")}
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
          {spamChallenge}

          <Button isLoading={isLoading} type="submit" disabled={isLoading}>
            {t("submit")}
          </Button>
        </form>
      </Modal>
    </>
  );
};

export default FlagContent;
