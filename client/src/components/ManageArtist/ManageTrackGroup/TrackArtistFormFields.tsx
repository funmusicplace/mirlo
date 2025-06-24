import { css } from "@emotion/css";
import AutoComplete from "components/common/AutoComplete";
import Button from "components/common/Button";
import FormCheckbox from "components/common/FormCheckbox";
import { InputEl } from "components/common/Input";
import Pill from "components/common/Pill";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import api from "services/api";
import { hasId } from "./AlbumFormComponents/ManageTags";

const TrackArtistFormFields: React.FC<{
  artistIndex: number;
  disabled?: boolean;
}> = ({ artistIndex, disabled }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, control, setValue, watch } = useFormContext();
  const { fields, remove } = useFieldArray({
    control,
    name: "trackArtists",
  });

  const getOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Artist>(`artists`, {
      name: searchString,
    });
    return results.results.map((r) => ({
      id: r.id,
      name: r.name,
    }));
  }, []);

  const onSelect = React.useCallback(
    async (val: unknown) => {
      if (hasId(val) && typeof val.id === "number") {
        const artist = await api.get<Artist>(`artists/${val.id}`);
        setValue(`trackArtists.${artistIndex}.artistName`, artist.result.name, {
          shouldDirty: true,
        });
        setValue(`trackArtists.${artistIndex}.artistId`, val, {
          shouldDirty: true,
        });
      } else if (hasId(val) && typeof val.id === "string") {
        // it's a new value
        setValue(`trackArtists.${artistIndex}.artistName`, val.id, {
          shouldDirty: true,
        });
      }
    },
    [artistIndex, setValue]
  );

  const clearExistingArtist = React.useCallback(() => {
    setValue(`trackArtists.${artistIndex}.artistId`, undefined);
    setValue(`trackArtists.${artistIndex}.artistName`, undefined);
  }, [artistIndex, setValue]);

  const watchId = watch(`trackArtists.${artistIndex}.artistId`);
  const watchName = watch(`trackArtists.${artistIndex}.artistName`);

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        border: 1px solid var(--mi-darken-x-background-color);
        padding: 1rem;
        justify-content: space-between;

        div {
          margin-right: 1rem;
        }

        :not(:first-of-type) {
          margin-top: 1rem;
        }
      `}
    >
      <div>
        {!watchId && !watchName && (
          <AutoComplete
            getOptions={getOptions}
            showBackground
            allowNew
            placeholder="Search artists"
            onSelect={onSelect}
          />
        )}
        {(watchId || watchName) && (
          <div
            className={css`
              margin: 0.25rem 0 0.5rem;
            `}
          >
            {t(watchId ? "artistOnMirlo" : "artist")}:{" "}
            <Pill>
              {watchName}{" "}
              <Button
                size="compact"
                startIcon={<FaTimes />}
                variant="dashed"
                title="Clear"
                onClick={clearExistingArtist}
              />
            </Pill>
          </div>
        )}

        <InputEl
          {...register(`trackArtists.${artistIndex}.role`)}
          placeholder="Role"
          disabled={disabled}
        />

        <FormCheckbox
          keyName={`trackArtists.${artistIndex}.isCoAuthor`}
          description={t("coAuthorCheck")}
          disabled={disabled}
        />
      </div>
      {fields.length > 1 && (
        <Button
          onClick={() => {
            remove(artistIndex);
          }}
          type="button"
          variant="dashed"
          size="compact"
          disabled={disabled}
        >
          Remove this artist
        </Button>
      )}
    </div>
  );
};

export default TrackArtistFormFields;
