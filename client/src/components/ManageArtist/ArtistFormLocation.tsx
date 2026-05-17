import { css } from "@emotion/css";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import Modal from "components/common/Modal";
import Pill from "components/common/Pill";
import {
  queryLocationTags,
  useAddLocationTag,
  useRemoveLocationTag,
} from "queries/locationTags";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { FaSave, FaTimes } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

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

  const watchedLocation = watch("location");

  return (
    <>
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        {artist?.location && (
          <div
            className={css`
              opacity: 0.5;
              white-space: nowrap;
              flex-shrink: 0;
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
            className="overflow-hidden text-ellipsis whitespace-nowrap block! min-w-0 shrink opacity-50"
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
      <Modal
        open={isEditing}
        onClose={() => {
          reset();
          setIsEditing(false);
        }}
        title={t("editLocation") ?? ""}
        size="small"
      >
        <div className="flex flex-col items-start gap-2 mt-1">
          <AutoComplete
            placeholder={t("searchLocations")}
            getOptions={handleSearchLocations}
            id="input-location"
            onSelect={(result) => {
              if (typeof result === "object" && result !== null) {
                if (result.isNew) {
                  setValue("location", result.name);
                } else {
                  handleAddTag(Number(result.id));
                }
              }
            }}
            allowNew={true}
          />
          {currentTags.length === 0 && !watchedLocation ? (
            <p
              className={css`
                color: var(--mi-lighten-text-color);
                font-size: 0.9rem;
              `}
            >
              {t("noLocationsAdded")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {watchedLocation ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="opacity-50 text-sm">
                      {watchedLocation}
                    </span>
                    <span className="text-xs opacity-40">
                      {t("customLocation")}
                    </span>
                  </div>
                  <ArtistButton
                    title={t("removeCustomLocation")}
                    smallIcon
                    size="compact"
                    onClick={() => setValue("location", "")}
                    startIcon={<FaTimes />}
                    className="h-8! w-8! p-0!"
                  />
                </div>
              ) : null}
              {currentTags.map((tag) => (
                <Pill>
                  <span>
                    {[tag.city, tag.region, tag.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <ArtistButton
                    smallIcon
                    size="compact"
                    onClick={() => handleRemoveTag(tag.id)}
                    startIcon={<FaTimes />}
                    title={t("removeLocationTag")}
                  />
                </Pill>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-4 justify-end">
          <ArtistButton
            size="compact"
            startIcon={<FaTimes />}
            variant="outlined"
            onClick={() => {
              reset();
              setIsEditing(false);
            }}
          >
            {t("cancel")}
          </ArtistButton>
          <ArtistButton
            size="compact"
            startIcon={<FaSave />}
            onClick={handleSubmit(handleSave)}
          >
            {t("saveLocation")}
          </ArtistButton>
        </div>
      </Modal>
    </>
  );
};

export default ArtistFormLocation;
