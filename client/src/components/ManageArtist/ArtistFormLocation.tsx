import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaSave, FaTimes } from "react-icons/fa";
import { IoLocationSharp } from "react-icons/io5";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { ArtistButton } from "components/Artist/ArtistButtons";

interface FormData {
  location: string;
}

interface ArtistLocationProps {
  isManage: boolean;
  artist: Pick<Artist, "location" | "properties">;
  onSubmit: (data: FormData) => Promise<void>;
}

const ArtistFormLocation: React.FC<ArtistLocationProps> = ({
  isManage,
  artist,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { register, handleSubmit, reset } = useForm<FormData>({
    values: { location: artist?.location ?? "" },
  });

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(data);
      snackbar("Updated location", { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar]
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
            `}
          >
            {artist?.location}
          </div>
        )}
        {!artist?.location && isManage && (
          <div
            className={css`
              opacity: 0.5;
            `}
          >
            {t("editLocation")}
          </div>
        )}
        {isManage && (
          <ArtistButton
            variant="dashed"
            size="compact"
            onlyIcon
            onClick={() => setIsEditing(true)}
            startIcon={<FaPen />}
          ></ArtistButton>
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
          <InputEl
            {...register(`location`)}
            placeholder={t("exampleLocation") ?? ""}
            colors={artist.properties?.colors}
          />
        </div>
        <div
          className={css`
            display: flex;
            gap: 0.5rem;
          `}
        >
          <ArtistButton
            collapsible
            size="compact"
            startIcon={<FaSave />}
            onClick={handleSubmit(handleSave)}
          >
            <p>{t("saveLocation")}</p>
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
            <p>{t("cancel")}</p>
          </ArtistButton>
        </div>
      </div>
    </>
  );
};

export default ArtistFormLocation;
