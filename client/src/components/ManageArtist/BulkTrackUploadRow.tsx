import { fmtMSS } from "utils/tracks";
import { TrackData } from "./BulkTrackUpload";
import React from "react";
import { BsBraces } from "react-icons/bs";
import IconButton from "components/common/IconButton";
import { useFieldArray, useFormContext } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import { FaPlus } from "react-icons/fa";
import { css } from "@emotion/css";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";

export const BulkTrackUploadRow: React.FC<{
  track: TrackData;
  index: number;
}> = ({ track, index }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const { register, control } = useFormContext();
  const [showMetaData, setShowMetaData] = React.useState(false);
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tracks.${index}.trackArtists`,
  });

  return (
    <tr>
      <td>
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
              <div
                className={css`
                  display: flex;
                  align-items: center;

                  div {
                    margin-right: 1rem;
                  }

                  :not(:first-child) {
                    margin-top: 1rem;
                  }
                `}
              >
                <div>
                  <InputEl
                    {...register(
                      `tracks.${index}.trackArtists.${artistIndex}.artistName`
                    )}
                    placeholder="Artist name"
                    key={a.id}
                  />
                  <InputEl
                    {...register(
                      `tracks.${index}.trackArtists.${artistIndex}.role`
                    )}
                    placeholder="Role"
                  />
                  <InputEl
                    {...register(
                      `tracks.${index}.trackArtists.${artistIndex}.artistId`
                    )}
                    placeholder="ID if the artist exists in Mirlo"
                  />
                  <label
                    htmlFor={`${index}.${artistIndex}.isCoAuthor`}
                    className={css`
                      display: flex;
                      padding: 0.25rem;
                      align-items: center;
                      font-size: 0.8rem;
                      input {
                        width: 2rem;
                      }
                    `}
                  >
                    <InputEl
                      id={`${index}.${artistIndex}.isCoAuthor`}
                      type="checkbox"
                      {...register(
                        `tracks.${index}.trackArtists.${artistIndex}.isCoAuthor`
                      )}
                    />
                    {t("coAuthorCheck")}
                  </label>
                </div>
                <Button
                  onClick={() => remove(artistIndex)}
                  type="button"
                  variant="outlined"
                  compact
                >
                  Remove this artist
                </Button>
              </div>
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
      {/* <td>{track.duration && fmtMSS(+track.duration)}</td> */}
      <td>
        <SelectEl defaultValue="paid" {...register(`tracks.${index}.status`)}>
          <option value="preview">{t("preview")}</option>
          <option value="must-own">{t("mustOwn")}</option>
        </SelectEl>
      </td>
      <td>
        <IconButton
          compact
          onClick={() => setShowMetaData((val) => !val)}
          type="button"
        >
          <BsBraces />
        </IconButton>
        {showMetaData && JSON.stringify(track)}
      </td>
    </tr>
  );
};
