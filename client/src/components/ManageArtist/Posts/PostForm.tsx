import React from "react";

import { Controller, FormProvider, useForm } from "react-hook-form";
import Button from "../../common/Button";
import { InputEl } from "../../common/Input";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../../services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { SelectEl } from "components/common/Select";
import useErrorHandler from "services/useErrorHandler";
import TextEditor from "components/common/TextEditor";
import Box from "components/common/Box";
import { useAuthContext } from "state/AuthContext";
import { useNavigate } from "react-router-dom";
import { getArtistManageUrl } from "utils/artist";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtistSubscriptionTiers } from "queries";
import ImagesInPostManager from "components/common/TextEditor/ImagesInPostManager";
import useGetUserObjectById from "utils/useGetUserObjectById";

type FormData = {
  title: string;
  publishedAt: string;
  content: string;
  isPublic: boolean;
  minimumTier: string;
  shouldSendEmail: boolean;
};

const PostForm: React.FC<{
  post: Post;
  reload: (postId?: number) => Promise<unknown>;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, post, onClose }) => {
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });

  const { data: tiers } = useQuery(
    queryManagedArtistSubscriptionTiers({
      artistId: artist.id,
      includeDefault: true,
    })
  );

  const publishedAt = post ? new Date(post.publishedAt) : new Date();
  publishedAt.setMinutes(
    publishedAt.getMinutes() - publishedAt.getTimezoneOffset()
  );

  const { objects: images, reload: reloadImages } =
    useGetUserObjectById<PostImage>(`manage/posts/${post?.id}/images`, {
      multiple: true,
    });

  const methods = useForm<FormData>({
    defaultValues: post
      ? {
          ...post,
          publishedAt: publishedAt.toISOString().slice(0, 16),
        }
      : {
          publishedAt: publishedAt.toISOString().slice(0, 16),
          shouldSendEmail: true,
        },
  });

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

  const { register, handleSubmit, watch } = methods;

  const isPublic = watch("isPublic");
  const minimumTier = watch("minimumTier");

  const existingId = post.id;
  const userId = user?.id;

  const publicationDate = watch("publishedAt");

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          let postId;
          const picked = {
            ...pick(data, ["title", "content", "isPublic", "shouldSendEmail"]),
            publishedAt: new Date(data.publishedAt + ":00").toISOString(),
            artistId: artist.id,
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
    [reload, existingId, snackbar, artist.id, errorHandler, onClose, userId, t]
  );

  const doPublish = React.useCallback(async () => {
    try {
      await api.put(`manage/posts/${existingId}/publish`, {});
      reload(existingId);
      reloadImages();
      snackbar(t("publishedPost"));
    } catch (e) {
      console.error(e);
    }
  }, [existingId]);

  const doDelete = React.useCallback(async () => {
    try {
      const confirmed = window.confirm(t("confirmDelete") ?? "");
      if (confirmed) {
        await api.delete(`manage/posts/${existingId}`);
        navigate(getArtistManageUrl(artist.id));
      }
    } catch (e) {
      console.error(e);
    }
  }, [artist.id, existingId, navigate, t, userId]);

  const isFuture = new Date() < new Date(publicationDate);

  const publishText = post.isDraft
    ? isFuture
      ? t("scheduleToPublish")
      : t("publishPost")
    : t("returnToDraft");

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(doSave)}>
        <FormComponent>
          <label>{t("title")}</label>{" "}
          <InputEl {...register("title")} required />
        </FormComponent>
        <FormComponent>
          <label>{t("publicationDate")} </label>
          <InputEl type="datetime-local" {...register("publishedAt")} />
          {new Date(publicationDate) > new Date() && (
            <Box variant="info" compact small>
              <>{t("inTheFuture")}</>
            </Box>
          )}
        </FormComponent>
        <FormComponent>
          <Controller
            name="content"
            render={({ field: { onChange, value } }) => {
              return (
                <TextEditor
                  onChange={(val: any) => {
                    onChange(val);
                  }}
                  value={value}
                  postId={post.id}
                  artistId={artist.id}
                  reloadImages={reloadImages}
                />
              );
            }}
          />
          <ImagesInPostManager
            postId={post.id}
            images={images}
            reload={reloadImages}
          />
        </FormComponent>
        <FormComponent
          className={css`
            margin-top: 0.5rem;
            display: flex;
            flex-direction: row !important;
            align-items: center !important;
            input {
              margin: 0 !important;
              height: 1rem;
              width: 1rem;
            }
            label {
              margin-bottom: 0 !important;
            }
          `}
        >
          <input id="private" type="checkbox" {...register("isPublic")} />{" "}
          <label htmlFor="private">
            {t("isSubscriptionOnly")}
            <small>{t("isSubscriptionPostOnly")}</small>
          </label>
        </FormComponent>
        {!isPublic && (
          <FormComponent
            className={css`
              margin-left: 1.75rem;
            `}
          >
            <label
              className={css`
                display: block;
                margin-bottom: 0.5rem;
              `}
            >
              {t("ifNotPublic")}
            </label>
            <SelectEl {...register("minimumTier")}>
              <option value="">None</option>
              {tiers?.results.map((tier) => (
                <option value={tier.id} key={tier.id}>
                  {tier.name}
                </option>
              ))}
            </SelectEl>
            {minimumTier && (
              <small>
                The mimimum tier will be{" "}
                <em>
                  {
                    tiers?.results.find((tier) => `${tier.id}` === minimumTier)
                      ?.name
                  }
                </em>
                .
              </small>
            )}
          </FormComponent>
        )}

        <FormComponent
          className={css`
            margin-top: 0.5rem;
            display: flex;
            flex-direction: row !important;
            align-items: center !important;
            input {
              margin: 0 !important;
              height: 1rem;
              width: 1rem;
            }
            label {
              margin-bottom: 0 !important;
            }
          `}
        >
          <input
            id="shouldSendEmail"
            type="checkbox"
            {...register("shouldSendEmail")}
          />{" "}
          <label htmlFor="shouldSendEmail">
            {t("shouldSendEmail")}
            <small>{t("shouldSendEmailContext")}</small>
          </label>
        </FormComponent>
        <div
          className={css`
            display: flex;
            width: 100%;
            justify-content: space-between;
            align-items: center;
          `}
        >
          <Button type="button" isLoading={isSaving} onClick={doDelete}>
            {t("delete")}
          </Button>
          <div>
            <Button
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
            </Button>
            <Button
              disabled={
                isSaving ||
                (minimumTier === "" && !isPublic) ||
                !methods.formState.isValid
              }
              isLoading={isSaving}
              onClick={doPublish}
              type="button"
            >
              {publishText}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default PostForm;
