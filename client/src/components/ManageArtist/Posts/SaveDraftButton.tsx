import React from "react";

import { useFormContext } from "react-hook-form";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../../services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";

import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtistSubscriptionTiers } from "queries";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { ArtistButton } from "components/Artist/ArtistButtons";

export type PostFormData = {
  title: string;
  publishedAt: string;
  content: string;
  isPublic: boolean;
  minimumTier: string;
  shouldSendEmail: boolean;
};

const SaveDraftButton: React.FC<{
  post: Post;
  reload: (postId?: number) => Promise<unknown>;
  artistId: number;
  onClose?: () => void;
}> = ({ reload, artistId, post, onClose }) => {
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });

  const { data: tiers } = useQuery(
    queryManagedArtistSubscriptionTiers({
      artistId,
      includeDefault: true,
    })
  );

  const publishedAt = post ? new Date(post.publishedAt) : new Date();
  publishedAt.setMinutes(
    publishedAt.getMinutes() - publishedAt.getTimezoneOffset()
  );

  const { reload: reloadImages } = useGetUserObjectById<PostImage>(
    `manage/posts/${post?.id}/images`,
    {
      multiple: true,
    }
  );

  const methods = useFormContext<PostFormData>();

  React.useEffect(() => {
    if ((tiers?.results.length ?? 0) > 0) {
      if (
        post.minimumSubscriptionTierId &&
        tiers?.results.find(
          (tier) => tier.id === post.minimumSubscriptionTierId
        )
      ) {
        methods.setValue("minimumTier", `${post.minimumSubscriptionTierId}`);
      }
    }
  }, [tiers]);

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
    [reload, existingId, snackbar, artistId, errorHandler, onClose, userId, t]
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
