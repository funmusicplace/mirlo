import { css } from "@emotion/css";
import MarkdownContent from "components/common/MarkdownContent";
import Modal from "components/common/Modal";
import TextArea from "components/common/TextArea";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaPen, FaSave, FaTimes } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import { ArtistButton } from "./ArtistButtons";
import { tabButtonClass } from "./ArtistHeaderActionsStrip";

interface FormData {
  bio: string;
}

const collapsedHeight = 65;

interface ArtistHeaderDescriptionProps {
  isManage: boolean;
  artist: Pick<Artist, "bio" | "shortDescription" | "properties">;
  onSubmit: (data: Pick<Artist, "bio">) => Promise<void>;
  size?: "tiny" | "compact";
}

const ArtistHeaderDescription: React.FC<ArtistHeaderDescriptionProps> = ({
  isManage,
  artist,
  onSubmit,
  size = "tiny",
}) => {
  const snackbar = useSnackbar();

  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({
    values: { bio: artist?.bio ?? "" },
  });

  let bio = artist?.bio;
  const displayedContent = isManage ? bio : bio || artist?.shortDescription;

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(data);
      snackbar(t("updatedBio"), { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar, t]
  );

  if (!displayedContent && !isManage) {
    return null;
  }

  return (
    <>
      <ArtistButton
        onClick={() => setIsOpen(true)}
        size={size}
        variant="transparent"
        color="foreground"
        uppercase
        bold={false}
        className={tabButtonClass}
      >
        {t("about")}
      </ArtistButton>
      <Modal open={isOpen} size="small" onClose={() => setIsOpen(false)}>
        {!isEditing && (
          <div className="w-full">
            {displayedContent ? (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <MarkdownContent
                    content={displayedContent}
                    className={css`
                      width: auto;
                      overflow: hidden;
                      text-overflow: ellipsis;

                      p img {
                        float: left;
                        margin: 0 1rem 1rem 0;
                        width: 150px;
                      }
                    `}
                  />
                </div>
                {isManage && (
                  <div className="shrink-0">
                    <ArtistButton
                      size="compact"
                      variant="dashed"
                      onClick={() => setIsEditing(true)}
                      startIcon={<FaPen />}
                    />
                  </div>
                )}
              </div>
            ) : (
              isManage && (
                <div className="flex flex-col items-start gap-2">
                  <ArtistButton
                    size="compact"
                    variant="dashed"
                    onClick={() => setIsEditing(true)}
                    startIcon={<FaPen />}
                  >
                    {t("editBioButton")}
                  </ArtistButton>
                  <p>{t("noBioYet")}</p>
                </div>
              )
            )}
          </div>
        )}
        {isEditing && (
          <div
            className={css`
              width: 100%;
              margin-bottom: 0.5rem;
            `}
          >
            <TextArea
              {...register(`bio`)}
              placeholder={t("bioPlaceholder") ?? ""}
              rows={8}
            />
            <div
              className={css`
                display: flex;
                justify-content: flex-end;
              `}
            >
              <ArtistButton
                size="compact"
                startIcon={<FaSave />}
                collapsible
                onClick={handleSubmit(handleSave)}
                className={css`
                  margin-right: 0.5rem;
                `}
              >
                {t("saveBio")}
              </ArtistButton>
              <ArtistButton
                size="compact"
                collapsible
                startIcon={<FaTimes />}
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                {t("cancel")}
              </ArtistButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ArtistHeaderDescription;
