import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaMapPin, FaSave, FaTimes } from "react-icons/fa";
import React from "react";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";

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
      <div>
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
        {isManage && (
          <Button compact onClick={() => setIsEditing(true)}>
            {t("editLocation")}
          </Button>
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
          justify-content: center;
          max-width: 300px;
          margin-bottom: 0.5rem;
        `}
      >
        <FaMapPin />
        <InputEl {...register(`location`)} placeholder="eg. North Pole" />
      </div>
      <div
        className={css`
          button {
            margin-right: 0.5rem;
          }
        `}
      >
        <Button compact startIcon={<FaSave />} onClick={handleSubmit(doSave)}>
          {t("saveLocation")}
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

export default ArtistFormLocation;
