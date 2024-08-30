import { useTranslation } from "react-i18next";
import { useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaGlobe, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import LinkIconDisplay, {
  findOutsideSite,
  linkUrlHref,
  outsideLinks,
} from "components/common/LinkIconDisplay";
import ArtistFormLinksView from "./ArtistFormLinksView";
import { useSnackbar } from "state/SnackbarContext";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";

interface FormData {
  linkArray: { url: string; linkType: string }[];
}

interface ArtistFormLinksProps {
  isManage: boolean;
  artist: Pick<Artist, "linksJson" | "links">;
  onSubmit: (data: Pick<Artist, "linksJson">) => Promise<void>;
}

export function transformFromLinks(
  artist: Pick<Artist, "links" | "linksJson">
): FormData {
  return {
    linkArray: [
      ...(artist.links?.map((l) => ({
        url: l.replace("mailto:", ""),
        linkType: findOutsideSite(l)?.name,
      })) ?? []),
      ...(artist.linksJson ?? []),
    ],
  };
}

function transformToLinks(data: FormData): Pick<Artist, "linksJson" | "links"> {
  return { linksJson: data.linkArray, links: [] };
}

const ArtistFormLinks: React.FC<ArtistFormLinksProps> = ({
  artist,
  isManage,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { register, control, watch, handleSubmit, reset, setValue } =
    useForm<FormData>({
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
      console.log("submitting", data);
      await onSubmit(transformToLinks(data));
      snackbar("Updated links", { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar]
  );

  const handleInputElBlur = React.useCallback(
    (val: string, index: number) => {
      console.log(val);
      const newVal = findOutsideSite(val).name;
      console.log(newVal);
      setValue(`linkArray.${index}.linkType`, newVal);
    },
    [setValue]
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
    <Modal open={true} size="small" onClose={() => setIsEditing(false)}>
      {fields.map((field, index) => {
        const site = outsideLinks.find((site) =>
          field.url.includes(site.matches)
        );
        return (
          <div
            key={index}
            className={css`
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
            {site?.icon ?? <FaGlobe />}
            <SelectEl {...register(`linkArray.${index}.linkType`)}>
              {outsideLinks.map((site) => (
                <option>{site.name}</option>
              ))}
            </SelectEl>
            <InputEl
              {...register(`linkArray.${index}.url`, {
                setValueAs: linkUrlHref,
                onBlur: (e) => handleInputElBlur(e.target.value, index),
              })}
              placeholder="eg. http://some.url"
              key={field.id}
              type="url"
            />
            <Button startIcon={<FaTrash />} onClick={() => remove(index)} />
          </div>
        );
      })}
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
          onClick={() =>
            append({
              url: "",
              linkType: outsideLinks[outsideLinks.length - 1]?.name,
            })
          }
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
    </Modal>
  );
};

export default ArtistFormLinks;
