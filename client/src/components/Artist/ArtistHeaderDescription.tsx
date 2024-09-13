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

interface FormData {
  bio: string;
}

const collapsedHeight = 65;

interface ArtistHeaderDescriptionProps {
  isManage: boolean;
  artist: Pick<Artist, "bio">;
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [canCollapse, setCanCollapse] = React.useState(false);
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

  React.useEffect(() => {
    const el = document.getElementById("markdown-content");
    if ((el?.clientHeight ?? 0) > collapsedHeight) {
      setCanCollapse(true);
      if (!isHeaderExpanded) {
        setIsCollapsed(true);
      }
    }
  }, [isEditing, isHeaderExpanded]);

  if (!isEditing) {
    return (
      <div
        className={css`
          width: 100%;
          display: flex;
          ${canCollapse ? `padding-bottom: 0;` : "padding-bottom: 0.2rem;"}

          ${isCollapsed ? `align-items: center;` : "align-items: flex-start;"}
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

                ${isCollapsed ? `max-height: ${collapsedHeight}px;` : ""}

                @media screen and (max-width: ${bp.medium}px) {
                  ${isCollapsed ? `max-height: ${collapsedHeight - 10}px;` : ""}
                }

                p img {
                  float: left;
                  margin: 0 1rem 1rem 0;
                  width: 150px;
                }
              `}
            />
            {canCollapse && (
              <div
                className={css`
                  width: 100%;
                  margin-top: -1.5rem;
                  padding-top: 0.75rem;
                  z-index: +1;
                  position: relative;
                  ${isCollapsed
                    ? `background: linear-gradient(180deg, transparent 0%, var(--mi-normal-background-color) 42%);`
                    : ""}

                  @media screen and (max-width: ${bp.medium}px) {
                    ${isCollapsed
                      ? `background: linear-gradient(180deg, transparent 0%, var(--mi-normal-background-color) 42%); padding-top: 1rem;`
                      : ""}
                  }
                `}
              >
                <Button
                  variant="link"
                  compact
                  startIcon={<FaChevronDown />}
                  className={css`
                    margin-top: 0.7rem;
                    margin-bottom: 0.25rem;

                    svg {
                      transition: transform 0.2s;

                      ${!isCollapsed ? `transform: rotate(-180deg);` : ""}
                    }
                  `}
                  onClick={() => setIsCollapsed((val) => !val)}
                >
                  {isCollapsed ? t("readMore") : t("readLess")}
                </Button>
              </div>
            )}
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
            <Button
              compact
              onlyIcon={!!bio}
              variant="dashed"
              onClick={() => setIsEditing(true)}
              startIcon={<FaPen />}
            >
              {!bio && t("noBioYet")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!isManage && bio === "") {
    return null;
  }

  return (
    <>
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
        <Button
          compact
          startIcon={<FaSave />}
          collapsible
          onClick={handleSubmit(handleSave)}
          className={css`
            margin-right: 0.5rem;
          `}
        >
          <p>{t("saveBio")}</p>
        </Button>
        <Button
          compact
          collapsible
          startIcon={<FaTimes />}
          onClick={() => {
            reset();
            setIsEditing(false);
          }}
        >
          <p>{t("cancel")}</p>
        </Button>
      </div>
    </>
  );
};

export default ArtistHeaderDescription;
