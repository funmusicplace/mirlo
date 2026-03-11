import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { css } from "@emotion/css";
import {
  queryLocationTags,
  useAddLocationTag,
  useRemoveLocationTag,
} from "queries/locationTags";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";
import Button from "components/common/Button";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";

interface LocationTagsEditorProps {
  artistId: number;
  currentTags: LocationTag[];
  onTagsChange?: () => void;
}

const LocationTagsEditor: React.FC<LocationTagsEditorProps> = ({
  artistId,
  currentTags,
  onTagsChange,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: allTags } = useQuery(queryLocationTags());
  const { mutate: addTag, isPending: isAdding } = useAddLocationTag();
  const { mutate: removeTag, isPending: isRemoving } = useRemoveLocationTag();

  const handleAddTag = (tagId: number) => {
    addTag(
      { artistId, locationTagId: tagId },
      {
        onSuccess: () => {
          snackbar("Location added", { type: "success" });
          queryClient.invalidateQueries({
            queryKey: ["artistLocationTags", artistId],
          });
          onTagsChange?.();
        },
        onError: () => {
          snackbar("Failed to add location", { type: "error" });
        },
      }
    );
  };

  const handleRemoveTag = (tagId: number) => {
    removeTag(
      { artistId, locationTagId: tagId },
      {
        onSuccess: () => {
          snackbar("Location removed", { type: "success" });
          queryClient.invalidateQueries({
            queryKey: ["artistLocationTags", artistId],
          });
          onTagsChange?.();
        },
        onError: () => {
          snackbar("Failed to remove location", { type: "error" });
        },
      }
    );
  };

  const availableTags =
    allTags?.filter(
      (tag) => !currentTags.some((current) => current.id === tag.id)
    ) || [];

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
      `}
    >
      <div>
        <h3>{t("locations") || "Locations"}</h3>
        <div
          className={css`
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin: 0.5rem 0;
          `}
        >
          {currentTags.length === 0 ? (
            <p
              className={css`
                color: var(--mi-lighten-text-color);
              `}
            >
              {t("noLocationsAdded") || "No locations added yet"}
            </p>
          ) : (
            currentTags.map((tag) => (
              <div
                key={tag.id}
                className={css`
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  padding: 0.5rem 1rem;
                  background: var(--mi-lighten-background-color);
                  border-radius: 4px;
                  font-size: 0.9rem;
                `}
              >
                <span>
                  {tag.city}
                  {tag.region && `, ${tag.region}`}, {tag.country}
                </span>
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  disabled={isRemoving}
                  className={css`
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    color: inherit;
                    display: flex;
                    align-items: center;
                    opacity: 0.7;
                    &:hover {
                      opacity: 1;
                    }
                  `}
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <Button onClick={() => setIsOpen(!isOpen)}>
          {isOpen
            ? t("hideLocations") || "Hide locations"
            : t("addLocations") || "Add locations"}
        </Button>
      </div>

      {isOpen && availableTags.length > 0 && (
        <div
          className={css`
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-top: 0.5rem;

            @media (max-width: ${bp.medium}px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          {availableTags.map((tag) => (
            <Button
              key={tag.id}
              onClick={() => handleAddTag(tag.id)}
              disabled={isAdding}
            >
              {tag.city}
              {tag.region && `, ${tag.region}`}, {tag.country}
            </Button>
          ))}
        </div>
      )}

      {isOpen && availableTags.length === 0 && (
        <p
          className={css`
            color: var(--mi-lighten-text-color);
            font-size: 0.9rem;
          `}
        >
          {t("allLocationsAdded") || "All available locations have been added"}
        </p>
      )}
    </div>
  );
};

export default LocationTagsEditor;
