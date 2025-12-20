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
      <div
        className={css`
          width: 100%;
          margin-top: 0 !important;
          padding: 1rem;
          font-size: 1rem;
          line-height: 1.5rem;
          position: relative;

          color: ${artist.properties?.colors?.background ||
          "var(--mi-background-color)"};
          background-color: ${artist.properties?.colors?.primary ||
          "var(--mi-foreground-color)"};

          > div {
            margin-top: 0 !important;
          }

          a {
            color: ${artist.properties?.colors?.background ||
            "var(--mi-background-color)"};
            text-decoration: underline;
          }
        `}
      >
        <MarkdownContent content={artist.announcementText} />
        {showButtons && !isOpen && (
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
        )}
      </div>
    );
  }

  if (showButtons && !isOpen && !artist.announcementText) {
    return (
      <Button
        variant="dashed"
        size="compact"
        onClick={() => setIsOpen(true)}
        className={css`
          background-color: ${artist.properties?.colors?.background ||
          "var(--mi-background-color)"} !important;
          color: ${artist.properties?.colors?.primary ||
          "var(--mi-foreground-color)"} !important;
        `}
      >
        {t("editAnnouncement")}
      </Button>
    );
  }

  return (
    <FormProvider {...methods}>
      <div
        className={css`
          width: 100%;
          position: relative;
          textarea {
            color: ${artist.properties?.colors?.background ||
            "var(--mi-background-color)"};
            background-color: ${artist.properties?.colors?.primary ||
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
              margin-bottom: 0 !important;

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
