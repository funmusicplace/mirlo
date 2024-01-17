import { css } from "@emotion/css";
import MarkdownContent from "components/common/MarkdownContent";
import { useGlobalStateContext } from "state/GlobalState";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import React from "react";
import { useArtistContext } from "state/ArtistContext";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useForm } from "react-hook-form";
import { FaChevronDown, FaPen, FaSave, FaTimes } from "react-icons/fa";
import TextArea from "components/common/TextArea";

interface FormData {
  bio: string;
}

const ArtistHeaderDescription: React.FC = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const {
    state: { artist },
    refresh,
  } = useArtistContext();
  const snackbar = useSnackbar();

  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [canCollapse, setCanCollapse] = React.useState(false);
  const userId = user?.id;
  const artistId = artist?.id;
  const artistUserId = artist?.userId;
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { bio: artist?.bio },
  });

  let bio =
    user && user.id === artist?.userId && !artist.bio
      ? t("noBioYet")
      : artist?.bio;

  const doSave = React.useCallback(
    async (data: FormData) => {
      try {
        if (userId && artistId && artistUserId === userId) {
          await api.put(`users/${userId}/artists/${artistId}`, {
            bio: data.bio,
          });
        }
        refresh();
        snackbar(t("updatedBio"), { type: "success" });
      } catch (e) {
      } finally {
        setIsEditing(false);
      }
    },
    [artistId, artistUserId, refresh, snackbar, userId, t]
  );

  React.useEffect(() => {
    const el = document.getElementById("markdown-content");

    if ((el?.clientHeight ?? 0) > 100) {
      setCanCollapse(true);
      setIsCollapsed(true);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div
        className={css`
          width: 100%;
          display: flex;
        `}
      >
        <div>
          <MarkdownContent
            content={bio}
            className={css`
              width: auto;
              overflow: hidden;
              text-overflow: ellipsis;

              ${isCollapsed ? `max-height: 100px` : ""}
            `}
          />
          {canCollapse && (
            <Button
              variant="link"
              compact
              startIcon={<FaChevronDown />}
              className={css`
                margin-top: 0.7rem;
                margin-bottom: 1rem;

                svg {
                  transition: transform 0.2s;

                  ${!isCollapsed ? `transform: rotate(-180deg);` : ""}
                }
              `}
              onClick={() => setIsCollapsed((val) => !val)}
            >
              {isCollapsed ? "read more" : "read less"}
            </Button>
          )}
        </div>

        {user && user.id === artist?.userId && (
          <div
            className={css`
              max-width: 5%;
              flex: 5%;
              margin-right: 0.2rem;
            `}
          >
            <Button
              compact
              onlyIcon
              transparent
              onClick={() => setIsEditing(true)}
              startIcon={<FaPen />}
              className={css`
                margin-top: -0.5rem;
                margin-left: -0.2rem;
              `}
            ></Button>
          </div>
        )}
      </div>
    );
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
          placeholder="Let listeners know a bit about yourself"
          rows={8}
        />
        <Button
          compact
          startIcon={<FaSave />}
          onClick={handleSubmit(doSave)}
          className={css`
            margin-right: 0.5rem;
          `}
        >
          {t("saveBio")}
        </Button>
        <Button
          compact
          startIcon={<FaTimes />}
          onClick={() => {
            reset();
            setIsEditing(false);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </>
  );
};

export default ArtistHeaderDescription;
