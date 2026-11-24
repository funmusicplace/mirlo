import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import { InputEl } from "components/common/Input";
import Pill from "components/common/Pill";
import SegmentedRadioGroup from "components/common/SegmentedRadioGroup";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import api from "services/api";

import { hasId } from "./AlbumFormComponents/ManageTags";

const APPEARS_AS_OPTIONS = [
  {
    value: "MAIN",
    label: "appearsAsMain",
    hint: "appearsAsMainHint",
  },
  {
    value: "FEATURED",
    label: "appearsAsFeatured",
    hint: "appearsAsFeaturedHint",
  },
  {
    value: "CREDITS_ONLY",
    label: "appearsAsCreditsOnly",
    hint: "appearsAsCreditsOnlyHint",
  },
] as const;

const TrackArtistFormFields: React.FC<{
  artistIndex: number;
  disabled?: boolean;
  onRemove: (index: number) => any;
  releaseArtistName: string;
}> = ({ artistIndex, disabled, onRemove, releaseArtistName }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register, setValue, watch } = useFormContext();
  const appearsAsId = React.useId();

  const getOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Artist>(`artists`, {
      name: searchString,
    });
    return results.results.map((r) => ({
      id: r.id,
      name: r.name,
      description: `/${r.urlSlug}`,
    }));
  }, []);

  const onSelect = React.useCallback(
    async (val: unknown) => {
      if (hasId(val) && typeof val.id === "number") {
        const artist = await api.get<Artist>(`artists/${val.id}`);
        setValue(`trackArtists.${artistIndex}.artistName`, artist.result.name, {
          shouldDirty: true,
        });
        setValue(`trackArtists.${artistIndex}.artistId`, val.id, {
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
  const appearsAs = watch(`trackArtists.${artistIndex}.appearsAs`);

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        border: 1px solid var(--mi-tint-x-color);
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
            id="input-track-artist"
            showBackground
            allowNew
            newOptionFirst
            placeholder={t("searchArtists")}
            onSelect={onSelect}
          />
        )}
        {(watchId || watchName) && (
          <div
            className={css`
              margin: 0.25rem 0 0.5rem;
            `}
          >
            {t(watchId ? "artistOnMirlo" : "trackArtistLabel")}:{" "}
            <Pill variant="tint">
              {watchName}{" "}
              <ArtistButton
                size="compact"
                startIcon={<FaTimes />}
                variant="dashed"
                title="Clear"
                onClick={clearExistingArtist}
              />
            </Pill>
          </div>
        )}

        <div className="mt-3">
          <InputEl
            {...register(`trackArtists.${artistIndex}.role`)}
            placeholder={t("role") ?? ""}
            disabled={disabled}
          />
        </div>

        <div className="mt-2">
          <span id={`${appearsAsId}-name`} className="sr-only">
            {watchName?.trim()
              ? t("appearsAsLabel", { name: watchName })
              : t("appearsAsLabelNoName")}
          </span>
          <SegmentedRadioGroup
            name={appearsAsId}
            idPrefix={appearsAsId}
            ariaLabelledBy={`${appearsAsId}-name`}
            size="compact"
            disabled={disabled}
            value={appearsAs}
            onChange={(value) =>
              setValue(`trackArtists.${artistIndex}.appearsAs`, value, {
                shouldDirty: true,
              })
            }
            options={APPEARS_AS_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
              describedBy: `${appearsAsId}-${option.value}-hint`,
            }))}
          />
          {APPEARS_AS_OPTIONS.map((option) => (
            <small
              key={option.value}
              id={`${appearsAsId}-${option.value}-hint`}
              className={
                appearsAs === option.value
                  ? "block mt-1 text-xs text-(--mi-lighter-foreground-color)"
                  : "sr-only"
              }
            >
              {t(option.hint, { releaseArtist: releaseArtistName })}
            </small>
          ))}
        </div>
      </div>
      <ArtistButton
        onClick={() => {
          onRemove(artistIndex);
        }}
        type="button"
        variant="dashed"
        size="compact"
        disabled={disabled}
        className="shrink-0"
      >
        {t("removeArtist")}
      </ArtistButton>
    </div>
  );
};

export default TrackArtistFormFields;
