import FormComponent from "components/common/FormComponent";
import { useTranslation } from "react-i18next";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";
import React from "react";
import Button from "components/common/Button";
import { FormProvider, useForm } from "react-hook-form";
import { css } from "@emotion/css";
import MarkdownContent from "components/common/MarkdownContent";
import { bp } from "../../../constants";
import useArtistQuery from "utils/useArtistQuery";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

export const AnnouncementWrapper: React.FC<{
  artistColors?: { primary: string; secondary: string; background: string };
  children: React.ReactNode;
}> = ({ artistColors, children }) => {
  return (
    <div
      className={css`
        width: 100%;
        margin-top: 0;
        font-size: 1rem;
        line-height: 1.5rem;
        position: relative;
        margin-bottom: 0.25rem;

        color: ${artistColors?.primary || "var(--mi-foreground-color)"};
        background-color: ${artistColors?.secondary ||
        "var(--mi-secondary-color)"};
      `}
    >
      <div
        className={css`
          backdrop-filter: brightness(95%) grayscale(10%);
          padding: 1rem;
          margin-bottom: 0.5rem;
          > div {
            margin-top: 0 !important;
          }

          a {
            color: ${artistColors?.background || "var(--mi-background-color)"};
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
      <AnnouncementWrapper artistColors={artist.properties?.colors}>
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
                background-color: ${artist.properties?.colors?.background ||
                "var(--mi-background-color)"} !important;
                color: ${artist.properties?.colors?.primary ||
                "var(--mi-foreground-color)"} !important;
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
          background-color: ${artist.properties?.colors?.secondary ||
          "var(--mi-secondary-color)"} !important;
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
            background-color: ${artist.properties?.colors?.background ||
            "var(--mi-background-color)"} !important;
            color: ${artist.properties?.colors?.primary ||
            "var(--mi-foreground-color)"} !important;
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
            color: ${artist.properties?.colors?.primary ||
            "var(--mi-primary-color)"};
            background-color: ${artist.properties?.colors?.secondary ||
            "var(--mi-foreground-color)"};
          }

          small {
            margin-top: -0.5rem;
          }

          button {
            background-color: ${artist.properties?.colors?.background ||
            "var(--mi-background-color)"};
            color: ${artist.properties?.colors?.primary ||
            "var(--mi-foreground-color)"};
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
              background-color: ${artist.properties?.colors?.background ||
              "var(--mi-background-color)"} !important;
              color: ${artist.properties?.colors?.primary ||
              "var(--mi-foreground-color)"} !important;
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

              color: ${artist.properties?.colors?.background ||
              "var(--mi-background-color)"};
              background-color: ${artist.properties?.colors?.primary ||
              "var(--mi-foreground-color)"};

              a {
                color: ${artist.properties?.colors?.background ||
                "var(--mi-background-color)"};
                text-decoration: underline;
              }
            `}
          >
            <div className="flex w-full align-center justify-between">
              <label>{t("announcement")}</label>
            </div>
            <SavingInput
              formKey={"announcementText"}
              url={`manage/artists/${artist.id}`}
              reload={refresh}
              rows={1}
              saveOnBlur
            />
            <small>{t("announcementDescription")}</small>
          </FormComponent>
        )}
      </div>
    </FormProvider>
  );
};

export default ManageArtistAnnouncement;
