import { useTranslation } from "react-i18next";
import { useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import LinkIconDisplay from "components/common/LinkIconDisplay";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import ArtistFormLinksView from "./ArtistFormLinksView";
import { useAuthContext } from "state/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { isMatch } from "lodash";

interface FormData {
  linkArray: { url: string }[];
}

const ArtistFormLinks: React.FC<{ artist: Artist; isManage: boolean }> = ({
  artist,
  isManage,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const { user } = useAuthContext();
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

  const queryClient = useQueryClient();

  const doSave = React.useCallback(
    async (data: FormData) => {
      try {
        if (userId && artistId && artistUserId === userId) {
          const links = data.linkArray.map((link) => {
            if (link.url.includes("@") && !link.url.startsWith("mailto:")) {
              return `mailto:${link.url}`;
            }
            return link.url;
          });
          await api.put(`users/${userId}/artists/${artistId}`, {
            links,
          });
        }

        // TODO: can be moved into a mutation
        await queryClient.invalidateQueries({
          predicate: (query) =>
            isMatch(Object(query.queryKey[0]), { artistId }),
        });

        snackbar("Updated links", { type: "success" });
      } catch (e) {
      } finally {
        setIsEditing(false);
      }
    },
    [artistId, artistUserId, queryClient, snackbar, userId],
  );

  if (!isEditing) {
    return (
      <ArtistFormLinksView
        artist={artist}
        isManage={isManage}
        setIsEditing={setIsEditing}
      />
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
