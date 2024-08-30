import { useTranslation } from "react-i18next";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaGlobe, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import {
  findOutsideSite,
  linkUrlHref,
  outsideLinks,
} from "components/common/LinkIconDisplay";
import ArtistLinksInHeader from "./ArtistLinksInHeader";
import { useSnackbar } from "state/SnackbarContext";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import FormCheckbox from "components/common/FormCheckbox";
import FormComponent from "components/common/FormComponent";

interface FormData {
  linkArray: { url: string; linkType: string; inHeader?: boolean }[];
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
        inHeader: true,
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
  const methods = useForm<FormData>({
    values: transformFromLinks(artist),
  });
  const { register, control, watch, handleSubmit, reset, setValue } = methods;
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

  const handleInputElBlur = React.useCallback(
    (val: string, index: number) => {
      const newVal = findOutsideSite(val).name;
      setValue(`linkArray.${index}.linkType`, newVal);
    },
    [setValue]
  );

  if (!isEditing) {
    return (
      <ArtistLinksInHeader
        artist={artist}
        isManage={isManage}
        setIsEditing={setIsEditing}
      />
    );
  }

  return (
    <Modal open={true} size="small" onClose={() => setIsEditing(false)}>
      <FormProvider {...methods}>
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
                  min-width: 1rem;
                }

                button {
                  margin-left: 0.5rem;
                }

                .header-wrapper {
                  padding: 0.5rem;
                  flex-grow: 1;
                  > div {
                    margin-bottom: 0;
                  }
                }
              `}
            >
              {site?.icon ?? <FaGlobe />}
              <SelectEl {...register(`linkArray.${index}.linkType`)}>
                {outsideLinks.map((site) => (
                  <option>{site.name}</option>
                ))}
              </SelectEl>
              <div className="header-wrapper">
                <InputEl
                  {...register(`linkArray.${index}.url`, {
                    setValueAs: linkUrlHref,
                    onBlur: (e) => handleInputElBlur(e.target.value, index),
                  })}
                  placeholder="eg. http://some.url"
                  key={field.id}
                  type="url"
                />
                <FormComponent style={{ display: "flex" }}>
                  <FormCheckbox
                    keyName={`linkArray.${index}.inHeader`}
                    description={t("linkInHeader")}
                  />
                </FormComponent>
              </div>
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
      </FormProvider>
    </Modal>
  );
};

export default ArtistFormLinks;
