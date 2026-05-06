import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Box from "components/common/Box";
import DraftRestoredBanner from "components/common/DraftRestoredBanner";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import TextEditor from "components/common/TextEditor";
import ImagesInPostManager from "components/common/TextEditor/ImagesInPostManager";
import { queryManagedArtistSubscriptionTiers } from "queries";
import React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getArtistManageUrl } from "utils/artist";
import { useFormPersist } from "utils/useFormPersist";
import useGetUserObjectById from "utils/useGetUserObjectById";

import api from "../../../services/api";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";

import EditPostHeader from "./EditPostHeader";

export type PostFormData = {
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
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });

  const { data: tiers } = useQuery(
    queryManagedArtistSubscriptionTiers({
      artistId: artist.id,
      includeDefault: true,
    })
  );

  const { objects: images, reload: reloadImages } =
    useGetUserObjectById<PostImage>(`manage/posts/${post?.id}/images`, {
      multiple: true,
    });

  const buildDefaultValues = React.useCallback((): Partial<PostFormData> => {
    const dateBase = post ? new Date(post.publishedAt) : new Date();
    dateBase.setMinutes(dateBase.getMinutes() - dateBase.getTimezoneOffset());
    const publishedAtIso = dateBase.toISOString().slice(0, 16);

    return post
      ? { ...post, publishedAt: publishedAtIso }
      : {
          publishedAt: publishedAtIso,
          shouldSendEmail: true,
          isPublic: true,
        };
  }, [post]);

  const methods = useForm<PostFormData>({
    defaultValues: buildDefaultValues(),
  });

  const draftKey = post?.id ? `postDraft-${post.id}` : null;
  const { hasRestoredDraft, clearDraft, discardDraft, dismissBanner } =
    useFormPersist(draftKey, methods);

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

  const { register, watch } = methods;

  const isPublic = watch("isPublic");

  const existingId = post.id;

  const publicationDate = watch("publishedAt");

  const doDelete = React.useCallback(async () => {
    try {
      const confirmed = window.confirm(t("confirmDelete") ?? "");
      if (confirmed) {
        setIsDeleting(true);
        await api.delete(`manage/posts/${existingId}`);
        navigate(getArtistManageUrl(artist.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  }, [artist.id, existingId, navigate, t]);

  return (
    <FormProvider {...methods}>
      <EditPostHeader
        reload={reload}
        onClose={onClose}
        onSaveSuccess={clearDraft}
      />

      <form onSubmit={(e) => e.preventDefault()}>
        {hasRestoredDraft && (
          <DraftRestoredBanner
            onDiscard={() => discardDraft(buildDefaultValues() as PostFormData)}
            onKeep={dismissBanner}
          />
        )}
        <FormComponent>
          <label htmlFor="input-title">{t("title")}</label>
          <SavingInput
            formKey="title"
            id="input-title"
            required
            url={`manage/posts/${post.id}`}
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-publication-date">
            {t("publicationDate")}{" "}
          </label>
          <SavingInput
            formKey="publishedAt"
            id="input-publication-date"
            type="datetime-local"
            required
            url={`manage/posts/${post.id}`}
          />
          {new Date(publicationDate) > new Date() && (
            <Box variant="info" compact small>
              {t("inTheFuture")}
            </Box>
          )}
        </FormComponent>
        <FormComponent>
          <Controller
            name="content"
            render={({ field: { onChange, value } }) => {
              return (
                <TextEditor
                  key={hasRestoredDraft ? "restored" : "initial"}
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
          <Controller
            name="isPublic"
            render={({
              field: { value = true, onChange, onBlur, ref, name },
            }) => (
              <input
                id="subscribers-only"
                type="checkbox"
                name={name}
                ref={ref}
                checked={!value}
                onChange={(event) => onChange(!event.target.checked)}
                onBlur={onBlur}
              />
            )}
          />{" "}
          <label htmlFor="subscribers-only">
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
              htmlFor="select-minimum-tier"
            >
              {t("ifNotPublic")}
            </label>
            <SelectEl id="select-minimum-tier" {...register("minimumTier")}>
              <option value="">None</option>
              {tiers?.results.map((tier) => (
                <option value={tier.id} key={tier.id}>
                  {tier.name}
                </option>
              ))}
            </SelectEl>
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
          <ArtistButton type="button" isLoading={isDeleting} onClick={doDelete}>
            {t("delete")}
          </ArtistButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default PostForm;
