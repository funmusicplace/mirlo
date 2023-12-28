import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormCheckbox from "components/common/FormCheckbox";
import { InputEl } from "components/common/Input";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const TrackArtistFormFields: React.FC<{
  a: Record<"id", string>;
  trackArtistsKey: string;
  artistIndex: number;
  disabled?: boolean;
}> = ({ a, trackArtistsKey, artistIndex, disabled }) => {
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

        :not(:first-of-type) {
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
          disabled={disabled}
        />
        <InputEl
          {...register(`${trackArtistsKey}.${artistIndex}.role`)}
          placeholder="Role"
          disabled={disabled}
        />
        <InputEl
          {...register(`${trackArtistsKey}.${artistIndex}.artistId`)}
          placeholder="ID if the artist exists in Mirlo"
          disabled={disabled}
        />
        <FormCheckbox
          keyName={`${trackArtistsKey}.${artistIndex}.isCoAuthor`}
          description={t("coAuthorCheck")}
          disabled={disabled}
        />
      </div>
      {fields.length > 1 && (
        <Button
          onClick={() => remove(artistIndex)}
          type="button"
          variant="outlined"
          compact
          disabled={disabled}
        >
          Remove this artist
        </Button>
      )}
    </div>
  );
};

export default TrackArtistFormFields;
