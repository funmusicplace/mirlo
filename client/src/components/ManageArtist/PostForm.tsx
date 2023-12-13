import React from "react";

import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { SelectEl } from "components/common/Select";
import useGetUserObjectById from "utils/useGetUserObjectById";

type FormData = {
  title: string;
  publishedAt: string;
  content: string;
  isPublic: boolean;
  minimumTier: string;
};

const PostForm: React.FC<{
  existing?: Post;
  reload: () => Promise<void>;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  const { objects: tiers } = useGetUserObjectById<ArtistSubscriptionTier>(
    "artists",
    user?.id,
    `${artist.id}`,
    `/subscriptionTiers?includeDefault=true`,
    { multiple: true }
  );

  React.useEffect(() => {
    const callback = async () => {};
    callback();
  }, [artist]);

  const publishedAt = existing ? new Date(existing.publishedAt) : new Date();
  publishedAt.setMinutes(
    publishedAt.getMinutes() - publishedAt.getTimezoneOffset()
  );

  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: existing
      ? { ...existing, publishedAt: publishedAt.toISOString().slice(0, 16) }
      : {
          publishedAt: publishedAt.toISOString().slice(0, 16),
        },
  });

  const isPublic = watch("isPublic");
  const minimumTier = watch("minimumTier");

  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          const picked = {
            ...pick(data, ["title", "content", "isPublic"]),
            publishedAt: new Date(data.publishedAt + ":00").toISOString(),
            artistId: artist.id,
            minimumSubscriptionTierId: isFinite(+data.minimumTier)
              ? Number(data.minimumTier)
              : undefined,
          };
          if (existingId) {
            await api.put(`users/${userId}/posts/${existingId}`, picked);
          } else {
            await api.post<
              {
                title?: string;
                artistId: number;
                cover?: File[];
                publishedAt: string;
              },
              { id: number }
            >(`users/${userId}/posts`, picked);
          }

          snackbar("Post updated", { type: "success" });
          reload?.();
          onClose?.();
        } catch (e) {
          snackbar("There was a problem with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [reload, existingId, snackbar, artist.id, onClose, userId]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <FormComponent>
        {t("title")} <InputEl {...register("title")} />
      </FormComponent>
      <FormComponent>
        {t("publicationDate")}{" "}
        <InputEl type="datetime-local" {...register("publishedAt")} />
      </FormComponent>
      <FormComponent>
        {t("content")} <TextArea {...register("content")} rows={10} />
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
        <FormComponent>
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
            {tiers?.map((tier) => (
              <option value={tier.id}>{tier.name}</option>
            ))}
          </SelectEl>
          {minimumTier && (
            <small>
              The mimimum tier will be{" "}
              <em>
                {tiers?.find((tier) => `${tier.id}` === minimumTier)?.name}
              </em>
              .
            </small>
          )}
        </FormComponent>
      )}
      <Button
        type="submit"
        disabled={isSaving || (minimumTier === "" && !isPublic)}
        isLoading={isSaving}
      >
        {existing ? t("save") : t("saveNew")} {t("post")}
      </Button>
    </form>
  );
};

export default PostForm;
