import { css } from "@emotion/css";
import MarkdownContent from "components/common/MarkdownContent";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useForm } from "react-hook-form";
import { FaChevronDown, FaPen, FaSave, FaTimes } from "react-icons/fa";
import TextArea from "components/common/TextArea";
import { bp } from "../../constants";
import { useSearchParams } from "react-router-dom";
import { ArtistButton } from "./ArtistButtons";
import Modal from "components/common/Modal";

interface FormData {
  bio: string;
}

const collapsedHeight = 65;

interface ArtistHeaderDescriptionProps {
  isManage: boolean;
  artist: Pick<Artist, "bio" | "properties">;
  onSubmit: (data: Pick<Artist, "bio">) => Promise<void>;
}

const ArtistHeaderDescription: React.FC<ArtistHeaderDescriptionProps> = ({
  isManage,
  artist,
  onSubmit,
}) => {
  const [searchParams] = useSearchParams();
  const isHeaderExpanded = searchParams.get("expandHeader");

  const snackbar = useSnackbar();

  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({
    values: { bio: artist?.bio ?? "" },
  });

  let bio = artist?.bio;

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(data);
      snackbar(t("updatedBio"), { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar, t]
  );
  if (!bio && !isManage) {
    return null;
  }

  return (
    <>
      <ArtistButton
        onClick={() => setIsOpen(true)}
        size="compact"
        className={css`
          margin-top: -1rem;
          margin-bottom: -1px;
          border-top-left-radius: 0.5rem !important;
          border-top-right-radius: 0.5rem !important;
        `}
      >
        About
      </ArtistButton>
      <Modal open={isOpen} size="small" onClose={() => setIsOpen(false)}>
        {!isEditing && (
          <div
            className={css`
              width: 100%;
              display: flex;
            `}
          >
            {bio && (
              <div>
                <MarkdownContent
                  content={bio}
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
            )}

            {isManage && (
              <div
                className={css`
                  max-width: 5%;
                  flex: 5%;
                  margin-right: 0.2rem;
                  margin-left: 0.2rem;
                `}
              >
                <ArtistButton
                  size="compact"
                  className={css`
                    white-space: nowrap;
                  `}
                  onlyIcon={!!bio}
                  variant="dashed"
                  onClick={() => setIsEditing(true)}
                  startIcon={<FaPen />}
                >
                  {!bio && t("noBioYet")}
                </ArtistButton>
              </div>
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
