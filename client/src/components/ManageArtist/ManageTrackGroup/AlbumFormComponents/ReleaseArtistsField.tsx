import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import Pill from "components/common/Pill";
import { RestoredLabel } from "components/common/RestoredFields";
import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import { queryLinkableArtists } from "queries";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { normalizeArtistName } from "utils/artist";

import { hasId } from "./ManageTags";

const MAX_RELEASE_ARTISTS = 20;

const ReleaseArtistsField: React.FC<{ profileName: string }> = ({
  profileName,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { control } = useFormContext<TrackGroupFormData>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "trackGroupArtists",
  });
  const { data: linkableArtists } = useQuery(queryLinkableArtists());
  const isProfileCredited = React.useCallback(
    (artistId: number) => fields.some((field) => field.artistId === artistId),
    [fields]
  );
  const findCreditedName = React.useCallback(
    (name: string) =>
      fields.findIndex(
        (field) =>
          normalizeArtistName(field.artistName) === normalizeArtistName(name)
      ),
    [fields]
  );

  const getOptions = React.useCallback(
    (searchString: string) =>
      (linkableArtists?.results ?? [])
        .filter(
          (artist) =>
            artist.name.toLowerCase().includes(searchString.toLowerCase()) &&
            !isProfileCredited(artist.id)
        )
        .map((artist) => ({
          id: artist.id,
          name: artist.name,
          description: `/${artist.urlSlug}`,
        })),
    [linkableArtists, isProfileCredited]
  );

  const onSelect = React.useCallback(
    (value: unknown) => {
      if (!hasId(value)) {
        return;
      }
      if (typeof value.id === "number") {
        const artist = linkableArtists?.results.find((a) => a.id === value.id);
        if (!artist || isProfileCredited(artist.id)) {
          return;
        }
        const linked = { artistName: artist.name, artistId: artist.id };
        const sameNameIndex = findCreditedName(artist.name);
        if (sameNameIndex >= 0 && fields[sameNameIndex].artistId == null) {
          update(sameNameIndex, linked);
        } else {
          append(linked);
        }
        return;
      }
      const artistName = `${value.id}`.trim();
      if (artistName && findCreditedName(artistName) < 0) {
        append({ artistName, artistId: null });
      }
    },
    [
      append,
      update,
      fields,
      linkableArtists,
      isProfileCredited,
      findCreditedName,
    ]
  );

  return (
    <FormComponent>
      <RestoredLabel htmlFor="input-release-artists" field="trackGroupArtists">
        {t("releaseArtists")}
      </RestoredLabel>
      {fields.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2 p-0 list-none">
          {fields.map((field, index) => (
            <li key={field.id}>
              <Pill variant="tint">
                {field.artistName}{" "}
                <ArtistButton
                  size="compact"
                  startIcon={<FaTimes />}
                  variant="dashed"
                  onlyIcon
                  type="button"
                  aria-label={t("removeReleaseArtist", {
                    name: field.artistName,
                  })}
                  onClick={() => {
                    remove(index);
                    inputRef.current?.focus();
                  }}
                />
              </Pill>
            </li>
          ))}
        </ul>
      )}
      {fields.length < MAX_RELEASE_ARTISTS && (
        <AutoComplete
          ref={inputRef}
          id="input-release-artists"
          ariaDescribedBy="hint-release-artists"
          getOptions={getOptions}
          onSelect={onSelect}
          allowNew
          linkExactMatch
          newOptionFirst
          showBackground
          placeholder={t("searchArtists")}
        />
      )}
      <small id="hint-release-artists" className="block max-w-prose">
        {t("releaseArtistsHint", { artistName: profileName })}
      </small>
    </FormComponent>
  );
};

export default ReleaseArtistsField;
