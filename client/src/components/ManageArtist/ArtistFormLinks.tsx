import { useTranslation } from "react-i18next";
import { useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import LinkIconDisplay from "components/common/LinkIconDisplay";
import ArtistFormLinksView from "./ArtistFormLinksView";
import { useSnackbar } from "state/SnackbarContext";

interface FormData {
  linkArray: { url: string }[];
}

interface ArtistFormLinksProps {
  isManage: boolean;
  artist: Pick<Artist, "links">;
  onSubmit: (data: Pick<Artist, "links">) => Promise<void>;
}

function transformFromLinks(artist: Pick<Artist, "links">): FormData {
  return { linkArray: artist.links?.map((l) => ({ url: l })) ?? [] };
}

function transformToLinks(data: FormData): Pick<Artist, "links"> {
  const links = data.linkArray.map((link) => {
    if (link.url.includes("@") && !link.url.startsWith("mailto:")) {
      return `mailto:${link.url}`;
    }
    return link.url;
  });

  return { links };
}

const ArtistFormLinks: React.FC<ArtistFormLinksProps> = ({
  artist,
  isManage,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { register, control, watch, handleSubmit, reset } = useForm<FormData>({
    values: transformFromLinks(artist),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "linkArray",
  });

  const links = watch(`linkArray`);

  const addDisabled = links?.[links.length - 1]?.url === "";

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(transformToLinks(data));
      snackbar("Updated links", { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar]
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
          onClick={handleSubmit(handleSave)}
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
