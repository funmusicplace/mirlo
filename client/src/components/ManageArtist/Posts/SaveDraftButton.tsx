import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { pick } from "lodash";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useGetUserObjectById from "utils/useGetUserObjectById";

import api from "../../../services/api";

import { PostFormData } from "./PostForm";

const SaveDraftButton: React.FC<{
  post: Post;
  reload: (postId?: number) => Promise<unknown>;
  artistId: number;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}> = ({ reload, artistId, post, onClose, onSaveSuccess }) => {
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });

  const { reload: reloadImages } = useGetUserObjectById<PostImage>(
    `manage/posts/${post?.id}/images`,
    {
      multiple: true,
    }
  );

  const methods = useFormContext<PostFormData>();

  const { handleSubmit, watch } = methods;

  const isPublic = watch("isPublic");
  const minimumTier = watch("minimumTier");

  const existingId = post.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: PostFormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          let postId;
          const picked = {
            ...pick(data, ["title", "content", "isPublic", "shouldSendEmail"]),
            publishedAt: new Date(data.publishedAt + ":00").toISOString(),
            artistId: artistId,
            minimumSubscriptionTierId:
              isFinite(+data.minimumTier) && +data.minimumTier !== 0
                ? Number(data.minimumTier)
                : undefined,
          };
          const response = await api.put<
            Partial<Post>,
            { result: { id: number } }
          >(`manage/posts/${existingId}`, picked);
          postId = response.result.id;

          onSaveSuccess?.();
          snackbar(t("postUpdated"), { type: "success" });
          reload(postId);
          reloadImages();
          onClose?.();
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [
      reload,
      existingId,
      snackbar,
      artistId,
      errorHandler,
      onClose,
      userId,
      t,
      onSaveSuccess,
      reloadImages,
    ]
  );

  return (
    <ArtistButton
      variant="dashed"
      className={css`
        margin-right: 1rem;
      `}
      type="button"
      disabled={
        isSaving ||
        (minimumTier === "" && !isPublic) ||
        !methods.formState.isValid
      }
      isLoading={isSaving}
      onClick={handleSubmit(doSave)}
    >
      {post.isDraft ? t("saveDraft") : t("updatePost")}
    </ArtistButton>
  );
};

export default SaveDraftButton;
