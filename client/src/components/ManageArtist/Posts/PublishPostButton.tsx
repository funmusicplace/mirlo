import { ArtistButton } from "components/Artist/ArtistButtons";
import { pick } from "lodash";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { PostFormData } from "./PostForm";

const PublishPostButton: React.FC<{
  post: Post;
  reload: (postId?: number) => void;
}> = ({ post, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  const snackbar = useSnackbar();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const { ask } = useConfirm();
  const { watch, handleSubmit } = useFormContext<PostFormData>();

  const { reload: reloadImages } = useGetUserObjectById<PostImage>(
    `manage/posts/${post?.id}/images`,
    {
      multiple: true,
    }
  );
  const content = watch("content");
  const isDraft = post.isDraft;
  const title = watch("title");

  const existingId = post.id;

  const doPublish = React.useCallback(
    async (data: PostFormData) => {
      try {
        setIsPublishing(true);

        if (post.isDraft && (content === "" || content === "<p></p>")) {
          const ok = await ask(t("contentIsEmpty"));
          if (!ok) {
            return;
          }
        }

        if (post.isDraft && title === "") {
          const ok = await ask(t("titleIsEmpty"));
          if (!ok) {
            return;
          }
        }
        const picked = {
          ...pick(data, ["title", "content", "isPublic", "shouldSendEmail"]),
          publishedAt: new Date(data.publishedAt + ":00").toISOString(),
          artistId: post.artistId,
          minimumSubscriptionTierId:
            isFinite(+data.minimumTier) && +data.minimumTier !== 0
              ? Number(data.minimumTier)
              : undefined,
        };
        await api.put<Partial<Post>, { result: { id: number } }>(
          `manage/posts/${existingId}`,
          picked
        );
        await api.put(`manage/posts/${existingId}/publish`, {});
        reload(existingId);
        reloadImages();
        snackbar(t("publishedPost"), { type: "success" });
      } catch (e) {
        console.error(e);
      } finally {
        setIsPublishing(false);
      }
    },
    [existingId, title, content, isDraft]
  );

  const minimumTier = watch("minimumTier");
  const publicationDate = watch("publishedAt");

  const isFuture = new Date() < new Date(post.publishedAt);

  const publishText = post.isDraft
    ? isFuture
      ? t("scheduleToPublish")
      : t("publishPost")
    : t("returnToDraft");

  return (
    <ArtistButton
      disabled={!minimumTier || !publicationDate}
      isLoading={isPublishing}
      onClick={handleSubmit(doPublish)}
      type="submit"
    >
      {publishText}
    </ArtistButton>
  );
};

export default PublishPostButton;
