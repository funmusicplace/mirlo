import { css } from "@emotion/css";
import React from "react";
import { FaPlus } from "react-icons/fa";
import TrackArtistFormFields from "./TrackArtistFormFields";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";
import { useFieldArray, useFormContext } from "react-hook-form";

const ManageTrackArtists: React.FC<{ trackArtistsKey: string }> = ({
  trackArtistsKey,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { control } = useFormContext();

  const { fields, append } = useFieldArray({
    control,
    name: trackArtistsKey,
  });

  return (
    <>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        `}
      >
        <div>
          {fields.map((a, artistIndex) => (
            <TrackArtistFormFields
              a={a}
              artistIndex={artistIndex}
              trackArtistsKey={trackArtistsKey}
              key={a.id}
            />
          ))}
        </div>
        <Button
          onClick={() => {
            append({ artistName: "" });
          }}
          type="button"
          className={css`
            margin-left: 1rem;
          `}
          compact
          startIcon={<FaPlus />}
          variant="outlined"
        >
          {t("addNewArtist")}
        </Button>
      </div>
    </>
  );
};

export default ManageTrackArtists;
