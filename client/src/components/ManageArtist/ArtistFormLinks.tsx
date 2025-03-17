import { useTranslation } from "react-i18next";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
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
  linkArray: Link[];
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
        linkType: "",
        linkLabel: "",
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
      snackbar(t("updatedLinks"), { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar]
  );

  const handleInputElBlur = React.useCallback(
    (val: string, index: number) => {
      const newVal = findOutsideSite({ url: val, linkType: "" }).name;
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
          const linkType = watch(`linkArray.${index}.linkType`);
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
                
                .link-wrapper {
                    display: grid;
                    align-items: center;
                    grid-template-columns: 1fr 2fr;
                    grid-gap: 1rem;
                    grid-template-areas:
                        "iconLabel iconSelect"
                        "nameLabel nameInput"
                        "urlLabel urlInput"
                        "checkbox checkbox"
                }

                .link-wrapper label {
                    text-align: right;
                }
              `}
            >
              <div className="link-wrapper">
                <label className={css`grid-area: iconLabel`} htmlFor={`linkIcon${index}`}>Link icon</label>
                <div id={`linkIcon${index}`}>
                  <SelectEl
                    {...register(`linkArray.${index}.linkType`)}>
                    {outsideLinks
                      .sort((a, b) => {
                        if (a.name > b.name) {
                          return 1;
                        }
                        if (a.name < b.name) {
                          return -1;
                        }
                        return 0;
                      })
                      .map((site) => (
                        <option key={site.name}>{t(site.name, site.name)}</option>
                      ))}
                  </SelectEl>
                  &nbsp;{outsideLinks.find(l => l.name === linkType)?.icon}
                </div>
                <label className={css`grid-area: nameLabel`} htmlFor={`linkLabel${index}`}>Link text</label>
                <InputEl className={css`grid-area: nameInput`} id={`linkLabel${index}`} {...register(`linkArray.${index}.linkLabel`, {
                  onBlur: (e) => setValue(`linkArray.${index}.linkType`, e.target.value)
                })}
                  placeholder={t("linkLabel") ?? ""}
                />
                <label className={css`grid-area: urlLabel`} htmlFor={`linkUrl${index}`}>URL</label>
                <InputEl
                  className={css`grid-area: urlInput`}
                  id={`linkUrl${index}`}
                  {...register(`linkArray.${index}.url`, {
                    setValueAs: linkUrlHref,
                    onBlur: (e) => handleInputElBlur(e.target.value, index),
                  })}
                  placeholder={t("linkPlaceholder") ?? ""}
                  key={field.id}
                  type="url"
                />
                <FormComponent className={css`grid-area: checkbox`} style={{ display: "flex" }}>
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
            flex-wrap: wrap;
            button {
              margin-left: 0.2rem;
              margin-right: 0.5rem;
            }
          `}
        >
          <Button
            size="compact"
            variant="transparent"
            onClick={() =>
              append({
                url: "",
                linkType: "",
              })
            }
            disabled={addDisabled}
            startIcon={<FaPlus />}
          >
            {t("addNewLink")}
          </Button>
          <Button
            size="compact"
            startIcon={<FaSave />}
            onClick={handleSubmit(handleSave)}
            disabled={addDisabled}
          >
            {t("saveLinks")}
          </Button>
          <Button
            size="compact"
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
