import { ArtistButton } from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { pick } from "lodash";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";
import useGetUserObjectById from "utils/useGetUserObjectById";

import { PostFormData, toDateTimeLocalValue } from "./PostForm";
export const shouldConfirmPublishDate = (
  publishedAt: string,
  now: Date = new Date()
) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishedAt)) {
    return false;
  }

  const chosen = new Date(publishedAt + ":00");

  if (isNaN(chosen.getTime())) {
    return false;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return chosen < startOfToday;
};

const PublishPostButton: React.FC<{
  post: Post;
  reload: (postId?: number) => void;
  onSaveSuccess?: () => void;
  getBodyContent: () => string;
}> = ({ post, reload, onSaveSuccess, getBodyContent }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "postForm" });
  const snackbar = useSnackbar();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const { ask } = useConfirm();
  const { watch, handleSubmit, setValue } = useFormContext<PostFormData>();
  const [pendingPublish, setPendingPublish] =
    React.useState<PostFormData | null>(null);

  const { reload: reloadImages } = useGetUserObjectById<PostImage>(
    `manage/posts/${post?.id}/images`,
    {
      multiple: true,
    }
  );
  const isDraft = post.isDraft;
  const title = watch("title");

  const existingId = post.id;

  const doPublish = React.useCallback(
    async (data: PostFormData, publishedAtOverride?: string) => {
      try {
        setIsPublishing(true);

        const bodyContent = getBodyContent();

        if (post.isDraft && (bodyContent === "" || bodyContent === "<p></p>")) {
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
          ...pick(data, ["title", "isPublic", "shouldSendEmail", "urlSlug"]),
          content: bodyContent,
          publishedAt:
            publishedAtOverride ??
            new Date(data.publishedAt + ":00").toISOString(),
          postSubscriptionTierIds: data.subscriptionTierIds
            ? data.subscriptionTierIds
                .map(Number)
                .filter((id) => Number.isFinite(id) && id !== 0)
            : undefined,
        };
        await api.put<Partial<Post>, { result: { id: number } }>(
          `manage/posts/${existingId}`,
          picked
        );
        await api.put(`manage/posts/${existingId}/publish`, {});
        onSaveSuccess?.();
        reload(existingId);
        reloadImages();
        snackbar(t("publishedPost"), { type: "success" });
      } catch (e) {
        console.error(e);
      } finally {
        setIsPublishing(false);
      }
    },
    [
      existingId,
      title,
      isDraft,
      onSaveSuccess,
      ask,
      post.artistId,
      post.isDraft,
      reload,
      reloadImages,
      snackbar,
      t,
      getBodyContent,
    ]
  );

  const publicationDate = watch("publishedAt");

  const isFuture = new Date() < new Date(post.publishedAt);

  const publishText = post.isDraft
    ? isFuture
      ? t("scheduleToPublish")
      : t("publishPost")
    : t("returnToDraft");

  const onPublishClick = handleSubmit(async (data: PostFormData) => {
    if (post.isDraft && shouldConfirmPublishDate(data.publishedAt)) {
      setPendingPublish(data);
      return;
    }
    await doPublish(data);
  });

  const publishKeepingDate = async () => {
    const data = pendingPublish;
    setPendingPublish(null);
    if (data) {
      await doPublish(data);
    }
  };

  const publishWithTodaysDate = async () => {
    const data = pendingPublish;
    setPendingPublish(null);
    if (data) {
      const today = new Date();
      setValue("publishedAt", toDateTimeLocalValue(today));
      await doPublish(data, today.toISOString());
    }
  };

  return (
    <>
      <ArtistButton
        disabled={!publicationDate}
        isLoading={isPublishing}
        onClick={onPublishClick}
        type="submit"
      >
        {publishText}
      </ArtistButton>
      <Modal
        open={!!pendingPublish}
        onClose={() => setPendingPublish(null)}
        title={t("publishDateInPastTitle")}
      >
        <div className="flex flex-col gap-4">
          <p>
            {t("publishDateInPastBody", {
              date: pendingPublish
                ? formatDate({
                    date: new Date(
                      pendingPublish.publishedAt + ":00"
                    ).toISOString(),
                    i18n,
                  })
                : "",
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={publishKeepingDate}>
              {t("publishDateInPastKeep", {
                date: pendingPublish
                  ? formatDate({
                      date: new Date(
                        pendingPublish.publishedAt + ":00"
                      ).toISOString(),
                      i18n,
                    })
                  : "",
              })}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={publishWithTodaysDate}
            >
              {t("publishDateInPastToday")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PublishPostButton;
