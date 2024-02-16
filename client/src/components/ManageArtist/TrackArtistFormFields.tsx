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

const TrackArtistFormFields: React.FC<{
  a: Record<"id", string>;
  trackArtistsKey: string;
  artistIndex: number;
  disabled?: boolean;
}> = ({ a, trackArtistsKey, artistIndex, disabled }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, control, setValue, watch } = useFormContext();
  const { fields, remove } = useFieldArray({
    control,
    name: trackArtistsKey,
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
    async (val: number | string) => {
      if (typeof val === "number") {
        const artist = await api.get<Artist>(`artists/${val}`);
        setValue(
          `${trackArtistsKey}.${artistIndex}.artistName`,
          artist.result.name,
          { shouldDirty: true }
        );
        setValue(`${trackArtistsKey}.${artistIndex}.artistId`, val, {
          shouldDirty: true,
        });
      } else {
        // it's a new value
        setValue(`${trackArtistsKey}.${artistIndex}.artistName`, val, {
          shouldDirty: true,
        });
      }
    },
    [artistIndex, setValue, trackArtistsKey]
  );

  const clearExistingArtist = React.useCallback(() => {
    setValue(`${trackArtistsKey}.${artistIndex}.artistId`, undefined);
    setValue(`${trackArtistsKey}.${artistIndex}.artistName`, undefined);
  }, [artistIndex, setValue, trackArtistsKey]);

  const watchId = watch(`${trackArtistsKey}.${artistIndex}.artistId`);
  const watchName = watch(`${trackArtistsKey}.${artistIndex}.artistName`);

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
                compact
                startIcon={<FaTimes />}
                variant="dashed"
                title="Clear"
                onClick={clearExistingArtist}
              />
            </Pill>
          </div>
        )}

        <InputEl
          {...register(`${trackArtistsKey}.${artistIndex}.role`)}
          placeholder="Role"
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
          onClick={() => {
            console.log("artistIndex", artistIndex);
            remove(artistIndex);
          }}
          type="button"
          variant="dashed"
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
