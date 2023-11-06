import { TrackData } from "./BulkTrackUpload";
import React from "react";
import IconButton from "components/common/IconButton";
import { useFieldArray, useFormContext } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaCheck, FaEllipsisV, FaPlus } from "react-icons/fa";
import { css } from "@emotion/css";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";
import Tooltip from "components/common/Tooltip";
import LoadingSpinner from "components/common/LoadingSpinner";
import TrackArtistFormFields from "./TrackArtistFormFields";
import { fmtMSS } from "utils/tracks";
import SelectTrackPreview from "./SelectTrackPreview";

export const BulkTrackUploadRow: React.FC<{
  track: TrackData;
  index: number;
  uploadingState?: string;
}> = ({ track, index, uploadingState }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
  const { register, control } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `tracks.${index}.trackArtists`,
  });

  return (
    <>
      <tr
        className={css`
          ${uploadingState
            ? `
            opacity: .4;
            pointer-events: none;
            `
            : ""}
        `}
      >
        <td>
          {uploadingState === "completed" && (
            <div
              className={css`
                color: green;
              `}
            >
              <FaCheck />
            </div>
          )}
          {(uploadingState === "waiting" || uploadingState === "active") && (
            <LoadingSpinner />
          )}
        </td>
        <td>
          <InputEl {...register(`tracks.${index}.order`)} />
          <InputEl {...register(`tracks.${index}.title`)} />
        </td>
        <td>
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
                  index={index}
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
        </td>
        <td className="alignRight">
          {track.duration && fmtMSS(+track.duration)}
        </td>
        <td>
          <SelectTrackPreview index={index} />
        </td>
        <td className="alignRight">
          <div
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            <Tooltip hoverText={t("moreTrackDetails")} underline={false}>
              <IconButton
                compact
                onClick={() => setShowMoreDetails((val) => !val)}
                type="button"
              >
                <FaEllipsisV />
              </IconButton>
            </Tooltip>
          </div>
        </td>
      </tr>
      {showMoreDetails && (
        <tr>
          <td colSpan={99}>
            <div
              className={css`
                max-width: 600px;
                max-height: 200px;
                overflow: scroll;
              `}
            >
              <strong>raw id3 tag: </strong>
              {JSON.stringify(track.metadata, null, 2)}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
