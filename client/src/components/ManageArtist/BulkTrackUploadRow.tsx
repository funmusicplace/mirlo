import { TrackData } from "./BulkTrackUpload";
import React from "react";
import IconButton from "components/common/IconButton";
import { useFieldArray, useFormContext } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaCheck, FaEllipsisV, FaPlus, FaTrash } from "react-icons/fa";
import { css } from "@emotion/css";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";
import Tooltip from "components/common/Tooltip";
import LoadingSpinner from "components/common/LoadingSpinner";
import TrackArtistFormFields from "./TrackArtistFormFields";
import { fmtMSS } from "utils/tracks";
import SelectTrackPreview from "./SelectTrackPreview";
import ManageTrackArtists from "./ManageTrackArtists";

export const BulkTrackUploadRow: React.FC<{
  track: TrackData;
  index: number;
  uploadingState?: string;
  isSaving?: boolean;
  remove: (index: number) => void;
}> = ({ track, index, uploadingState, isSaving, remove }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
  const { register } = useFormContext();

  const removeOnClick = React.useCallback(() => {
    remove(index);
  }, [index, remove]);

  return (
    <>
      <tr
        className={css`
          ${uploadingState || isSaving
            ? `
            opacity: .4;
            pointer-events: none;
            `
            : ""}
        `}
      >
        <td>
          {!uploadingState && (
            <>
              <IconButton onClick={removeOnClick} type="button">
                <FaTrash />
              </IconButton>
            </>
          )}
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
          <ManageTrackArtists
            trackArtistsKey={`tracks.${index}.trackArtists`}
          />
        </td>
        <td className="alignRight">
          {track.duration && fmtMSS(+track.duration)}
        </td>
        <td>
          <SelectTrackPreview statusKey={`tracks.${index}.status`} />
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
