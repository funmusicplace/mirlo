import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import MarkdownContent from "components/common/MarkdownContent";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useArtistQuery from "utils/useArtistQuery";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { bp } from "../../../constants";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";

export const AnnouncementWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div
      className={css`
        width: 100%;
        margin-top: 0;
        font-size: 1rem;
        line-height: 1.5rem;
        position: relative;
        margin-bottom: 0.25rem;

        color: var(--mi-button-color);
        background-color: var(--mi-button-text-color);
      `}
    >
      <div
        className={css`
          opacity: 0.9;
          padding: 1rem;
          margin-bottom: 0.5rem;
          > div {
            margin-top: 0 !important;
          }

          a {
            color: var(--mi-background-color);
            text-decoration: underline;
          }
        `}
      >
        {children}
      </div>
    </div>
  );
};

const ManageArtistAnnouncement: React.FC<{
  showButtons?: boolean;
}> = ({ showButtons }) => {
  const { data: artist, refetch: refetchArtist } = useArtistQuery();
  const { refetch: refetchManage } = useManagedArtistQuery();
  const methods = useForm({
    defaultValues: {
      announcementText: artist?.announcementText || "",
    },
  });

  const refresh = () => {
    refetchManage();
    refetchArtist();
  };
  const [isOpen, setIsOpen] = React.useState(false);

  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  if (!artist) return null;

  if (!isOpen && artist.announcementText) {
    return (
      <AnnouncementWrapper>
        <MarkdownContent content={artist.announcementText} />
        {showButtons && !isOpen && (
          <div
            className={css`
              @media screen and (max-width: ${bp.medium}px) {
                padding: var(--mi-side-paddings-xsmall);
                width: 100%;
              }
            `}
          >
            <Button
              variant="dashed"
              size="compact"
              onClick={() => setIsOpen(true)}
              className={css`
                position: absolute;
                top: 0.75rem;
                right: 1rem;
                background-color: var(--mi-background-color) !important;
                color: var(--mi-button-color) !important;
              `}
            >
              {t("editAnnouncement")}
            </Button>
          </div>
        )}
      </AnnouncementWrapper>
    );
  }

  if (showButtons && !isOpen && !artist.announcementText) {
    return (
      <div
        className={css`
          padding: var(--mi-side-paddings-xsmall);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          background-color: var(--mi-button-text-color) !important;
          filter: brightness(95%) grayscale(10%);

          @media screen and (max-width: ${bp.medium}px) {
            padding-top: 0.5rem;
          }
        `}
      >
        <Button
          variant="dashed"
          size="compact"
          onClick={() => setIsOpen(true)}
          className={css`
            background-color: var(--mi-background-color) !important;
            color: var(--mi-button-color) !important;
            width: 100%;
            padding: var(--mi-side-paddings-xsmall);
          `}
        >
          {t("editAnnouncement")}
        </Button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div
        className={css`
          width: 100%;
          position: relative;

          textarea {
            color: var(--mi-button-color);
            background-color: var(--mi-button-text-color);
          }

          small {
            margin-top: -0.5rem;
          }

          button {
            background-color: var(--mi-background-color);
            color: var(--mi-button-color);
          }

          @media screen and (max-width: ${bp.medium}px) {
            font-size: 0.9rem;
            line-height: 1.4rem;
          }
        `}
      >
        {showButtons && isOpen && (
          <Button
            variant="dashed"
            size="compact"
            onClick={() => setIsOpen(false)}
            className={css`
              position: absolute;
              top: 0.75rem;
              right: 1rem;
              background-color: var(--mi-background-color) !important;
              color: var(--mi-button-color) !important;
            `}
          >
            {t("close")}
          </Button>
        )}
        {isOpen && (
          <FormComponent
            className={css`
              margin-top: 0 !important;
              margin-bottom: 0.5rem !important;

              textarea {
                margin-bottom: 0 !important;
              }

              margin-top: 0 !important;
              padding: 1rem;
              font-size: 1rem;
              line-height: 1.5rem;

              color: var(--mi-background-color);
              background-color: var(--mi-button-color);

              a {
                color: var(--mi-background-color);
                text-decoration: underline;
              }
            `}
          >
            <div className="flex w-full align-center justify-between">
              <label htmlFor="textarea-announcement">{t("announcement")}</label>
            </div>
            <SavingInput
              ariaDescribedBy="hint-announcement"
              formKey={"announcementText"}
              id="textarea-announcement"
              url={`manage/artists/${artist.id}`}
              reload={refresh}
              rows={1}
              saveOnBlur
            />
            <small id="hint-announcement">{t("announcementDescription")}</small>
          </FormComponent>
        )}
      </div>
    </FormProvider>
  );
};

export default ManageArtistAnnouncement;
