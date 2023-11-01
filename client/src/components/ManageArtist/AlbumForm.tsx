import React from "react";

import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";

const AlbumForm: React.FC<{
  existing?: TrackGroup;
  reload: () => Promise<void> | void;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const { register, handleSubmit } = useForm<{
    published: boolean;
    title: string;
    type: TrackGroup["type"];
    minPrice: string;
    releaseDate: string;
    about: string;
    coverFile: File[];
  }>({
    defaultValues: {
      ...existing,
      releaseDate: existing?.releaseDate.split("T")[0],
      minPrice: `${existing?.minPrice ? existing.minPrice / 100 : ""}`,
    } ?? {
      published: false,
    },
  });

  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: {
      title: string;
      published: boolean;
      type: TrackGroup["type"];
      minPrice: string;
      releaseDate: string;
      about: string;
      coverFile: File[];
    }) => {
      if (userId) {
        try {
          setIsSaving(true);
          let savedId = existingId;
          if (existingId) {
            const sending = {
              ...pick(data, [
                "title",
                "private",
                "type",
                "releaseDate",
                "about",
              ]),
              minPrice: data.minPrice ? +data.minPrice * 100 : undefined,
              releaseDate: new Date(data.releaseDate).toISOString(),
            };
            await api.put<Partial<TrackGroup>, TrackGroup>(
              `users/${userId}/trackGroups/${existingId}`,
              {
                ...sending,
                artistId: artist.id,
              }
            );
          } else {
            const newGroup = await api.post<
              {
                title?: string;
                artistId: number;
                cover?: File[];
                minPrice?: number;
              },
              { id: number }
            >(`users/${userId}/trackGroups`, {
              ...pick(data, [
                "title",
                "private",
                "type",
                "releaseDate",
                "about",
                "minPrice",
              ]),
              minPrice: data.minPrice ? +data.minPrice * 100 : undefined,
              artistId: artist.id,
            });
            savedId = newGroup.id;
          }
          // data cover is a string if the form hasn't been changed.
          if (
            savedId &&
            data.coverFile[0] &&
            typeof data.coverFile[0] !== "string"
          ) {
            await api.uploadFile(
              `users/${userId}/trackGroups/${savedId}/cover`,
              data.coverFile
            );
          }
          snackbar("Trackgroup updated", { type: "success" });
          onClose?.();
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [userId, existingId, snackbar, onClose, artist.id, errorHandler, reload]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      {/* <FormComponent>
        Display artist: <InputEl {...register("display_artist")} />
      </FormComponent> */}
      <FormComponent>
        {t("title")}: <InputEl {...register("title")} />
      </FormComponent>
      <FormComponent
        style={{
          flexDirection: "column",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {t("cover")}:
        {existing?.cover && (
          <img src={existing.cover.sizes?.[120]} alt="album cover" />
        )}
      </FormComponent>
      <FormComponent>
        <InputEl
          type="file"
          id="image"
          {...register("coverFile")}
          accept="image/*"
        />
      </FormComponent>
      <FormComponent>
        {t("type")}:{" "}
        <SelectEl defaultValue="lp" {...register("type")}>
          <option value="lp">{t("lp")}</option>
          <option value="ep">{t("ep")}</option>
          <option value="single">{t("single")}</option>
          <option value="compilation">{t("compilation")}</option>
        </SelectEl>
      </FormComponent>

      <FormComponent>
        {t("releaseDate")}:{" "}
        <InputEl type="date" {...register("releaseDate")} required />
      </FormComponent>
      <FormComponent>
        {t("about")}: <TextArea {...register("about")} rows={7} />
      </FormComponent>
      <FormComponent>
        {t("price")}:
        <InputEl type="number" {...register("minPrice")} />
      </FormComponent>
      <Button type="submit" disabled={isSaving} isLoading={isSaving}>
        {existing
          ? existing.published
            ? t("saveDraft")
            : t("update")
          : t("submitAlbum")}
      </Button>
    </form>
  );
};

export default AlbumForm;
