import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import Button from "components/common/Button";
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
    console.log("clicking");
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

  const [tags, setTags] = React.useState<string[]>(existingTags ?? []);
  const { trackGroupId } = useParams();
  const { user } = useAuthContext();
  const userId = user?.id;

  const removeTag = (index: number) => {
    console.log("going to set parent tags");
    setTags((allTags) => {
      const clones = cloneDeep(allTags);
      clones.splice(index, 1);
      console.log("removing a tag");
      update(clones);
      return clones;
    });
  };

  const update = React.useCallback(
    async (newTags: string[]) => {
      console.log("updateTags", newTags);
      try {
        await api.put(`manage/trackGroups/${trackGroupId}/tags`, newTags);
      } catch (e) {
        console.error("e", e);
      }
    },
    [trackGroupId, userId]
  );

  const findTags = async (searchValue: string) => {
    const tags = await api.getMany<{ tag: string; id: number }>(
      `tags?tag=${searchValue}`
    );
    return tags.results.map((t) => ({ name: t.tag, id: t.tag }));
  };

  const saveTags = React.useCallback(
    async (newValue: unknown) => {
      console.log("saveTags newValue", newValue);
      if (hasId(newValue)) {
        console.log("saveTags existing", tags);
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
    <div
      className={css`
        margin-top: 1.5rem;
      `}
    >
      <h2>{t("albumTags")}</h2>
      {tags.length > 0 && (
        <div
          className={css`
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            margin-bottom: 1rem;
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
          onSelect={saveTags}
          placeholder={t("typeForTags")}
          allowNew
        />
      </div>
    </div>
  );
};

export default ManageTags;
