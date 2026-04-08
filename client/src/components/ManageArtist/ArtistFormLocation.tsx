import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { css } from "@emotion/css";
import { FaSave, FaTimes } from "react-icons/fa";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { FaPen } from "react-icons/fa";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryLocationTags,
  useAddLocationTag,
  useRemoveLocationTag,
} from "queries/locationTags";
import AutoComplete from "components/common/AutoComplete";
import Pill from "components/common/Pill";

interface FormData {
  location: string;
}

interface ArtistLocationProps {
  isManage: boolean;
  artist: Pick<Artist, "location" | "properties" | "id" | "artistLocationTags">;
  onSubmit: (data: FormData) => Promise<void>;
}

const ArtistFormLocation: React.FC<ArtistLocationProps> = ({
  isManage,
  artist,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const queryClient = useQueryClient();
  const { handleSubmit, watch, reset, setValue } = useForm<FormData>({
    defaultValues: { location: artist?.location ?? "" },
  });

  const { mutate: addTag } = useAddLocationTag();
  const { mutate: removeTag } = useRemoveLocationTag();

  const currentTags =
    artist.artistLocationTags?.map((alt) => alt.locationTag) || [];

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(data);
      snackbar(t("locationUpdated"), { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar, t]
  );

  React.useEffect(() => {
    if (isEditing) {
      reset({ location: artist?.location ?? "" });
    }
  }, [isEditing, artist?.location, reset]);

  const handleAddTag = (tagId: number) => {
    addTag(
      { artistId: artist.id, locationTagId: tagId },
      {
        onSuccess: async () => {
          snackbar(t("locationAdded"), { type: "success" });
        },
        onError: () => {
          snackbar(t("failedToAddLocation"), { type: "warning" });
        },
      }
    );
  };

  const handleRemoveTag = (tagId: number) => {
    removeTag(
      { artistId: artist.id, locationTagId: tagId },
      {
        onSuccess: () => {
          snackbar(t("locationRemoved"), { type: "success" });
        },
        onError: () => {
          snackbar(t("failedToRemoveLocation"), { type: "warning" });
        },
      }
    );
  };

  const handleSearchLocations = async (searchString: string) => {
    const trimmedSearch = searchString.trim();

    if (!trimmedSearch) {
      return [];
    }

    const matchingTags = await queryClient.ensureQueryData(
      queryLocationTags(trimmedSearch)
    );

    const availableTags = matchingTags.filter(
      (tag) => !currentTags.some((current) => current.id === tag.id)
    );

    return availableTags.map((tag) => ({
      id: tag.id,
      name: [tag.city, tag.region, tag.country].filter(Boolean).join(", "),
    }));
  };

  if (!isEditing) {
    return (
      <div className="flex items-center mt-1 md:mt-1 gap-2">
        {artist?.location && (
          <div
            className={css`
              opacity: 0.5;
            `}
          >
            {artist?.location}
          </div>
        )}
        {artist?.artistLocationTags?.map((tag) => (
          <ArtistButtonLink
            key={tag.locationTag.id}
            variant="link"
            color="foreground"
            to={`/search/locations/${tag.locationTag.slug}`}
          >
            {[
              tag.locationTag.city,
              tag.locationTag.region,
              tag.locationTag.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </ArtistButtonLink>
        ))}
        {!artist?.location &&
          isManage &&
          artist?.artistLocationTags?.length === 0 && (
            <div
              className={css`
                opacity: 0.5;
              `}
            >
              {t("editLocation")}
            </div>
          )}
        {isManage && (
          <ArtistButton
            variant="dashed"
            size="compact"
            onlyIcon
            smallIcon
            onClick={() => setIsEditing(true)}
            title={t("editLocation")}
            startIcon={<FaPen />}
          />
        )}
      </div>
    );
  }

  const watchedLocation = watch("location");

  return (
    <div className="flex w-full items-start">
      <div className="flex flex-col items-start gap-2">
        {currentTags.length === 0 ? (
          <p
            className={css`
              color: var(--mi-lighten-text-color);
              font-size: 0.9rem;
            `}
          >
            {t("noLocationsAdded")}
          </p>
        ) : (
          currentTags.map((tag) => (
            <Pill>
              <span>
                {[tag.city, tag.region, tag.country].filter(Boolean).join(", ")}
              </span>
              <ArtistButton
                smallIcon
                size="compact"
                onClick={() => handleRemoveTag(tag.id)}
                startIcon={<FaTimes />}
                title={t("removeLocationTag")}
              />
            </Pill>
          ))
        )}
        {watchedLocation ? (
          <div className="flex items-center gap-1">
            Custom location: {watchedLocation}{" "}
            <ArtistButton
              title={t("removeCustomLocation")}
              smallIcon
              size="compact"
              onClick={() => setValue("location", "")}
              startIcon={<FaTimes />}
            />
          </div>
        ) : null}
        <AutoComplete
          placeholder={t("searchLocations")}
          getOptions={handleSearchLocations}
          id="input-location"
          onSelect={(result) => {
            if (typeof result === "object" && result !== null) {
              if (result.isNew) {
                // User entered a custom location
                setValue("location", result.name);
              } else {
                // User selected an existing location tag
                handleAddTag(Number(result.id));
              }
            }
          }}
          allowNew={true}
        />
      </div>
      <div className="flex gap-1">
        <ArtistButton
          collapsible
          size="compact"
          startIcon={<FaSave />}
          onClick={handleSubmit(handleSave)}
          title={t("saveLocation")}
        >
          <p>{t("saveLocation")}</p>
        </ArtistButton>
        <ArtistButton
          size="compact"
          collapsible
          startIcon={<FaTimes />}
          title={t("cancel")}
          onClick={() => {
            reset();
            setIsEditing(false);
          }}
        >
          <p>{t("cancel")}</p>
        </ArtistButton>
      </div>
    </div>
  );
};

export default ArtistFormLocation;
