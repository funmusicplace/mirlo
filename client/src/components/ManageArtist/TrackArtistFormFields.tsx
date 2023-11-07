import { css } from "@emotion/css";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const TrackArtistFormFields: React.FC<{
  a: Record<"id", string>;
  index: number;
  artistIndex: number;
}> = ({ a, index, artistIndex }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, control } = useFormContext();

  const { fields, remove } = useFieldArray({
    control,
    name: `tracks.${index}.trackArtists`,
  });

  return (
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
      key={a.id}
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
          {...register(`tracks.${index}.trackArtists.${artistIndex}.role`)}
          placeholder="Role"
        />
        <InputEl
          {...register(`tracks.${index}.trackArtists.${artistIndex}.artistId`)}
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
      {fields.length > 1 && (
        <Button
          onClick={() => remove(artistIndex)}
          type="button"
          variant="outlined"
          compact
        >
          Remove this artist
        </Button>
      )}
    </div>
  );
};

export default TrackArtistFormFields;
