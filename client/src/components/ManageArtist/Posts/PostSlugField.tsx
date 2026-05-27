import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";

import { PostFormData } from "./PostForm";

const PostSlugField: React.FC<{ post: Post; artist: Artist }> = ({
  post,
  artist,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  const { register, watch, formState } = useFormContext<PostFormData>();
  const [isEditingSlug, setIsEditingSlug] = React.useState(false);

  const urlSlugValue = watch("urlSlug");

  const validateSlugUnique = React.useCallback(
    async (value: string | undefined) => {
      if (!value) return true;
      try {
        const response = await api.get<{ exists: boolean }>(
          `manage/posts/testExistence?urlSlug=${value.toLowerCase()}&artistId=${artist.id}&forPostId=${post.id}`
        );
        return !response.result.exists;
      } catch (e) {
        console.error("Error checking post slug uniqueness", e);
        return true;
      }
    },
    [artist.id, post.id]
  );

  if (!post.urlSlug) {
    return null;
  }

  return (
    <>
      {!isEditingSlug && (
        <small>
          {t("availableAt", {
            url: `${window.location.origin}/${artist.urlSlug}/posts/${urlSlugValue ?? post.urlSlug}`,
          })}{" "}
          <ArtistButton
            type="button"
            variant="link"
            onClick={() => setIsEditingSlug(true)}
          >
            {t("changeSlug")}
          </ArtistButton>
        </small>
      )}
      {isEditingSlug && (
        <>
          <label htmlFor="input-url-slug" className="mt-2 block">
            {t("urlSlug")}
          </label>
          <InputEl
            id="input-url-slug"
            {...register("urlSlug", {
              validate: { unique: validateSlugUnique },
            })}
          />
          {formState.errors.urlSlug?.type === "unique" && (
            <small className="error">{t("slugTaken")}</small>
          )}
          <small>{t("slugWarning")}</small>
        </>
      )}
    </>
  );
};

export default PostSlugField;
