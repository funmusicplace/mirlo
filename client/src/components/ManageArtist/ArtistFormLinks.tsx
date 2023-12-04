import { useTranslation } from "react-i18next";
import { useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import LinkIconDisplay from "components/common/LinkIconDisplay";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import { FaPen } from "react-icons/fa";

interface FormData {
  linkArray: { url: string }[];
}

const ArtistFormLinks: React.FC<{ isManage: boolean }> = ({ isManage }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const {
    state: { artist },
    refresh,
  } = useArtistContext();
  const {
    state: { user },
  } = useGlobalStateContext();
  const artistId = artist?.id;
  const artistUserId = artist?.userId;
  const userId = user?.id;
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { register, control, watch, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { linkArray: artist?.links?.map((l) => ({ url: l })) ?? [] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "linkArray",
  });

  const links = watch(`linkArray`);

  const addDisabled = links?.[links.length - 1]?.url === "";

  const doSave = React.useCallback(
    async (data: FormData) => {
      try {
        if (userId && artistId && artistUserId === userId) {
          await api.put(`users/${userId}/artists/${artistId}`, {
            links: data.linkArray.map((link) => link.url),
          });
        }
        refresh();
        snackbar("Updated links", { type: "success" });
      } catch (e) {
      } finally {
        setIsEditing(false);
      }
    },
    [artistId, artistUserId, refresh, snackbar, userId]
  );

  if (!isEditing) {
    return (
      <div
        className={css`
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
        `}
      >
        <div>
          {artist?.links?.map((l) => {
            let url;
            try {
              url = new URL(l).origin.replace(/https?:\/\//, "");
            } catch (e) {
              url = l.split("/")[0];
            }
            return (
              <a
                href={l}
                className={css`
                  display: inline-flex;
                  align-items: center;
                  margin-right: 0.75rem;

                  > svg {
                    margin-right: 0.5rem;
                  }
                `}
              >
                <LinkIconDisplay url={l} /> {url}
              </a>
            );
          })}
        </div>
        {isManage && (
          <Button
            compact
            transparent
            onClick={() => setIsEditing(true)}
            startIcon={<FaPen />}
          >
            {t("editLinks")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {fields.map((field, index) => (
        <div
          className={css`
            max-width: 50%;
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            margin-left: 0.5rem;

            > svg {
              margin-right: 0.5rem;
            }

            button {
              margin-left: 0.5rem;
            }
          `}
        >
          <LinkIconDisplay url={links[index].url} />
          <InputEl
            {...register(`linkArray.${index}.url`)}
            placeholder="eg. http://some.url"
            key={field.id}
            type="url"
          />
          <Button startIcon={<FaTrash />} onClick={() => remove(index)} />
        </div>
      ))}
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          button {
            margin-left: 0.2rem;
            margin-right: 0.5rem;
          }
        `}
      >
        <Button
          compact
          transparent
          onClick={() => append({ url: "" })}
          disabled={addDisabled}
          startIcon={<FaPlus />}
        >
          {t("addNewLink")}
        </Button>
        <Button
          compact
          startIcon={<FaSave />}
          onClick={handleSubmit(doSave)}
          disabled={addDisabled}
        >
          {t("saveLinks")}
        </Button>
        <Button
          compact
          startIcon={<FaTimes />}
          onClick={() => {
            reset();
            setIsEditing(false);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </>
  );
};

export default ArtistFormLinks;
