import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaEnvelope } from "react-icons/fa";
import { css } from "@emotion/css";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import Button from "./Button";
import FormComponent from "./FormComponent";
import TextArea from "./TextArea";
import Modal from "./Modal";
import { ArtistButton } from "components/Artist/ArtistButtons";

type FormData = { message: string };

const ContactArtist: React.FC<{
  artist: Pick<Artist, "id" | "name" | "userId" | "allowDirectMessages">;
}> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const methods = useForm<FormData>({ defaultValues: { message: "" } });

  if (!user || artist.allowDirectMessages === false || artist.userId === user.id) {
    return null;
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      await api.post(`artists/${artist.id}/contact`, { message: data.message });
      snackbar(t("contactMessageSent"), { type: "success" });
      methods.reset();
      setIsOpen(false);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ArtistButton
        size="compact"
        variant="outlined"
        type="button"
        onClick={() => setIsOpen(true)}
        startIcon={<FaEnvelope />}
        className={css`
          font-size: 0.75em !important;
        `}
      >
        {t("contact")}
      </ArtistButton>
      <Modal
        size="small"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("contactArtistTitle", { artistName: artist.name }) ?? ""}
      >
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <p
              className={css`
                margin-bottom: 1rem;
              `}
            >
              {t("contactArtistDescription", { artistName: artist.name })}
            </p>
            <FormComponent>
              <label htmlFor="contact-artist-message">
                {t("contactMessageLabel")}
              </label>
              <TextArea
                id="contact-artist-message"
                rows={6}
                {...methods.register("message", {
                  required: true,
                  maxLength: 5000,
                })}
              />
            </FormComponent>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!methods.watch("message")?.trim()}
            >
              {t("sendMessage")}
            </Button>
          </form>
        </FormProvider>
      </Modal>
    </>
  );
};

export default ContactArtist;
