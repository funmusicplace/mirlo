import { css } from "@emotion/css";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const TrackArtistFormFields: React.FC<{
  a: Record<"id", string>;
  trackArtistsKey: string;
  artistIndex: number;
}> = ({ a, trackArtistsKey, artistIndex }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, control } = useFormContext();

  const { fields, remove } = useFieldArray({
    control,
    name: trackArtistsKey,
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
          {...register(`${trackArtistsKey}.${artistIndex}.artistName`)}
          placeholder="Artist name"
          key={a.id}
        />
        <InputEl
          {...register(`${trackArtistsKey}.${artistIndex}.role`)}
          placeholder="Role"
        />
        <InputEl
          {...register(`${trackArtistsKey}.${artistIndex}.artistId`)}
          placeholder="ID if the artist exists in Mirlo"
        />
        <label
          htmlFor={`${trackArtistsKey}.${artistIndex}.isCoAuthor`}
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
            id={`${trackArtistsKey}.${artistIndex}.isCoAuthor`}
            type="checkbox"
            {...register(`${trackArtistsKey}.${artistIndex}.isCoAuthor`)}
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
