import { css } from "@emotion/css";
import {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import Pill from "components/common/Pill";
import { cloneDeep, uniq } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

export function hasId(entity: unknown): entity is { id: string | number } {
  if (!entity) {
    return false;
  }
  return (entity as { id?: number | string }).id !== undefined;
}

export const Tag = <li></li>;

const ArtistTag: React.FC<{
  tag: string;
  index: number;
  removeTag: (idx: number) => void;
}> = ({ tag, index, removeTag }) => {
  const onClick = React.useCallback(() => {
    removeTag(index);
  }, [removeTag, index]);

  return (
    <Pill>
      {tag}{" "}
      <ArtistButton
        startIcon={<FaTimes />}
        onClick={onClick}
        onlyIcon
        type="button"
        variant="dashed"
      />
    </Pill>
  );
};

const ManageTags: React.FC<{ tags?: string[] }> = ({ tags: existingTags }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { colors } = useGetArtistColors();
  const [tags, setTags] = React.useState<string[]>(existingTags ?? []);
  const { trackGroupId } = useParams();
  const { user } = useAuthContext();
  const userId = user?.id;

  const removeTag = (index: number) => {
    setTags((allTags) => {
      const clones = cloneDeep(allTags);
      clones.splice(index, 1);
      update(clones);
      return clones;
    });
  };

  const update = React.useCallback(
    async (newTags: string[]) => {
      try {
        await api.put(`manage/trackGroups/${trackGroupId}/tags`, newTags);
      } catch (e) {
        console.error("e", e);
      }
    },
    [trackGroupId, userId]
  );

  const findTags = async (searchValue: string) => {
    const tags = await api.getMany<{
      tag: string;
      id: number;
      trackGroupCount: number;
    }>(`tags?tag=${searchValue}`);
    return tags.results
      .sort((a, b) => {
        if (a.tag === searchValue) {
          return -1;
        } else if (b.tag === searchValue) {
          return 1;
        } else {
          if (a.trackGroupCount < b.trackGroupCount) {
            return 1;
          } else {
            return -1;
          }
        }
      })
      .map((t) => ({ name: t.tag, id: t.tag }));
  };

  const saveTags = React.useCallback(
    async (newValue: unknown) => {
      if (hasId(newValue)) {
        const newTags = uniq([
          ...tags,
          `${newValue.id}`.toLowerCase().split(" ").join("-"),
        ]);

        update(newTags);
        setTags(newTags);
      }
    },
    [tags, update]
  );

  return (
    <FormComponent
      className={css`
        margin-top: 1.5rem;
      `}
    >
      <label>{t("albumTags")}</label>

      <div
        className={css`
          display: inline-flex;
          max-width: 300px;
          align-items: center;

          input {
            margin-right: 1rem;
          }
        `}
      >
        <AutoComplete
          getOptions={findTags}
          colors={colors}
          onSelect={saveTags}
          placeholder={t("typeForTags")}
          allowNew
        />
      </div>
      {tags.length > 0 && (
        <div
          className={css`
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            margin-top: 0.5rem;
          `}
        >
          {tags.map((tag, index) => (
            <ArtistTag
              tag={tag}
              index={index}
              key={tag}
              removeTag={removeTag}
            />
          ))}
        </div>
      )}
    </FormComponent>
  );
};

export default ManageTags;
