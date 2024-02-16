import { css } from "@emotion/css";
import React from "react";
import { FaCheck, FaPlus } from "react-icons/fa";
import TrackArtistFormFields from "./TrackArtistFormFields";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";
import { useFieldArray, useFormContext } from "react-hook-form";
import Modal from "components/common/Modal";

const ManageTrackArtists: React.FC<{
  trackArtistsKey: string;
  disabled?: boolean;
}> = ({ trackArtistsKey, disabled }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [isOpen, setIsOpen] = React.useState(false);
  const { control } = useFormContext();

  const { fields, append } = useFieldArray({
    control,
    name: trackArtistsKey,
  });

  return (
    <>
      {fields
        .map(
          (field) => (field as unknown as { artistName: string })["artistName"]
        )
        .join(", ")}
      <Button variant="dashed" onClick={() => setIsOpen(true)}>
        {t("editTrackArtists")}
      </Button>
      <Modal
        title={t("trackArtists") ?? ""}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <div>
            {fields.map((a, artistIndex) => (
              <TrackArtistFormFields
                a={a}
                artistIndex={artistIndex}
                trackArtistsKey={trackArtistsKey}
                key={a.id}
                disabled={disabled}
              />
            ))}
          </div>
          <div>
            <Button
              onClick={() => {
                append({ artistName: "" });
              }}
              type="button"
              className={css`
                margin-top: 1rem;
              `}
              compact
              disabled={disabled}
              startIcon={<FaPlus />}
              variant="dashed"
            >
              {t("addNewArtist")}
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
              }}
              type="button"
              className={css`
                margin-left: 1rem;
              `}
              compact
              disabled={disabled}
              startIcon={<FaCheck />}
              variant="dashed"
            >
              {t("done")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageTrackArtists;
