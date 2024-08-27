import React from "react";

import { Controller, FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { SelectEl } from "components/common/Select";
import useGetUserObjectById from "utils/useGetUserObjectById";
import useErrorHandler from "services/useErrorHandler";
import TextEditor from "components/common/TextEditor";
import Box from "components/common/Box";
import { useAuthContext } from "state/AuthContext";
import { useNavigate } from "react-router-dom";
import { getArtistManageUrl } from "utils/artist";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtistSubscriptionTiers } from "queries";

type FormData = {
  title: string;
  publishedAt: string;
  content: string;
  isPublic: boolean;
  minimumTier: string;
  shouldSendEmail: boolean;
};

const PostForm: React.FC<{
  existing?: Post;
  reload: () => Promise<unknown>;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
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

  console.log("existing", tiers?.results);

  const publishedAt = existing ? new Date(existing.publishedAt) : new Date();
  publishedAt.setMinutes(
    publishedAt.getMinutes() - publishedAt.getTimezoneOffset()
  );

  const methods = useForm<FormData>({
    defaultValues: existing
      ? {
          ...existing,
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
        existing?.minimumSubscriptionTierId &&
        tiers?.results.find(
          (tier) => tier.id === existing.minimumSubscriptionTierId
        )
      ) {
        methods.setValue(
          "minimumTier",
          `${existing.minimumSubscriptionTierId}`
        );
      }
    }
  }, [tiers]);

  const { register, handleSubmit, watch } = methods;

  const isPublic = watch("isPublic");
  const minimumTier = watch("minimumTier");

  const existingId = existing?.id;
  const userId = user?.id;

  const publicationDate = watch("publishedAt");

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          const picked = {
            ...pick(data, ["title", "content", "isPublic", "shouldSendEmail"]),
            publishedAt: new Date(data.publishedAt + ":00").toISOString(),
            artistId: artist.id,
            minimumSubscriptionTierId:
              isFinite(+data.minimumTier) && +data.minimumTier !== 0
                ? Number(data.minimumTier)
                : undefined,
          };
          if (existingId) {
            await api.put(`manage/posts/${existingId}`, picked);
          } else {
            await api.post<
              {
                title?: string;
                artistId: number;
                cover?: File[];
                publishedAt: string;
              },
              { id: number }
            >(`manage/posts`, picked);
          }

          snackbar(t("postUpdated"), { type: "success" });
          reload?.();
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
                />
              );
            }}
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
          `}
        >
          <Button
            variant="dashed"
            disabled={
              isSaving ||
              (minimumTier === "" && !isPublic) ||
              !methods.formState.isValid
            }
            isLoading={isSaving}
            onClick={handleSubmit(doSave)}
          >
            {existing ? t("save") : t("saveNew")} {t("post")}
          </Button>
          {existing && (
            <Button type="button" isLoading={isSaving} onClick={doDelete}>
              {t("delete")}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};

export default PostForm;
