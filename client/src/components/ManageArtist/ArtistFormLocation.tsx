import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaSave, FaTimes } from "react-icons/fa";
import { IoLocationSharp } from "react-icons/io5";
import React from "react";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import { FaPen } from "react-icons/fa";
import { bp } from "../../constants";

interface FormData {
  location: string;
}

const ArtistFormLocation: React.FC<{ isManage: boolean }> = ({ isManage }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const {
    state: { artist },
    refresh,
  } = useArtistContext();
  const {
    state: { user },
  } = useGlobalStateContext();
  const artistId = artist?.id;
  const artistUserId = artist?.userId;
  const isArtistManager = artistUserId === user?.id;
  const userId = user?.id;
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { location: artist?.location },
  });

  const doSave = React.useCallback(
    async (data: FormData) => {
      try {
        if (userId && artistId && artistUserId === userId) {
          await api.put(`users/${userId}/artists/${artistId}`, {
            location: data.location,
          });
          refresh();
          snackbar("Updated links", { type: "success" });
        }
      } catch (e) {
      } finally {
        setIsEditing(false);
      }
    },
    [artistId, artistUserId, refresh, snackbar, userId]
  );

  if (!isEditing) {
    return (
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-top: 0.2rem;
          button {
            margin-left: 0.3rem;
            margin-top: -0.5rem;
          }

          @media screen and (max-width: ${bp.medium}px) {
            margin-top: 0rem;
          }
        `}
      >
        {artist?.location && (
          <div
            className={css`
              opacity: 0.7;
              text-transform: capitalize;
            `}
          >
            {artist?.location}
          </div>
        )}
        {!artist?.location && isArtistManager && (
          <div
            className={css`
              opacity: 0.5;
              text-transform: capitalize;
            `}
          >
            {t("editLocation")}
          </div>
        )}
        {isArtistManager && (
          <Button
            transparent
            small
            onlyIcon
            onClick={() => setIsEditing(true)}
            startIcon={<FaPen />}
          ></Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 300px;
            font-size: 1.4rem;

            @media screen and (max-width: ${bp.medium}px) {
              max-width: 200px;
            }
          `}
        >
          <IoLocationSharp />
          <InputEl {...register(`location`)} placeholder="eg. North Pole" />
        </div>
        <div
          className={css`
            display: flex;
            gap: 0.5rem;
          `}
        >
          <Button
            collapsible
            compact
            startIcon={<FaSave />}
            onClick={handleSubmit(doSave)}
          >
            <p>{t("saveLocation")}</p>
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
      </div>
    </>
  );
};

export default ArtistFormLocation;
