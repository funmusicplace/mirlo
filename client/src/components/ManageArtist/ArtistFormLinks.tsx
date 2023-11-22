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

interface FormData {
  linkArray: { url: string }[];
}

const ArtistFormLinks = () => {
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
    defaultValues: { linkArray: artist?.links.map((l) => ({ url: l })) ?? [] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "linkArray",
  });

  const links = watch(`linkArray`);

  const addDisabled = links?.[links.length - 1]?.url === "";
  console.log("addDisabled", addDisabled);

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
      <>
        <div>
          {artist?.links.map((l) => (
            <a
              href="l"
              className={css`
                display: inline-flex;
                align-items: center;
                margin-right: 0.75rem;
                margin-bottom: 0.5rem;

                > svg {
                  margin-right: 0.5rem;
                }
              `}
            >
              <LinkIconDisplay url={l} /> {l.replace(/https?:\/\//, "")}
            </a>
          ))}
        </div>
        <Button compact onClick={() => setIsEditing(true)}>
          {t("editLinks")}
        </Button>
      </>
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
            margin-bottom: 0.25rem;

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
          button {
            margin-right: 0.5rem;
          }
        `}
      >
        <Button
          compact
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
