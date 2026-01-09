import { useTranslation } from "react-i18next";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import { FaPen, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import React from "react";
import {
  findOutsideSite,
  isEmailLink,
  linkUrlHref,
  outsideLinks,
} from "components/common/LinkIconDisplay";
import { useSnackbar } from "state/SnackbarContext";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import FormCheckbox from "components/common/FormCheckbox";
import FormComponent from "components/common/FormComponent";
import { bp } from "../../constants";
import {
  ArtistButton,
  ArtistButtonAnchor,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import ManageArtistAnnouncement from "./ManageArtistDetails/ManageArtistAnnouncement";

interface FormData {
  linkArray: Link[];
}

interface ArtistFormLinksProps {
  isManage: boolean;
  artist: Pick<Artist, "linksJson" | "links">;
  onSubmit: (data: Pick<Artist, "linksJson">) => Promise<void>;
}

const normalizeStoredLink = (link: Link): Link => ({
  ...link,
  inHeader: link.inHeader ?? true,
  linkLabel: link.linkLabel ?? "",
  linkType: link.linkType ?? "",
  iconUrl: link.iconUrl ?? undefined,
});

export function transformFromLinks(
  artist: Pick<Artist, "links" | "linksJson">
): FormData {
  const normalizedJsonLinks = (artist.linksJson ?? []).map((link) =>
    normalizeStoredLink(link)
  );

  return {
    linkArray: [
      ...(artist.links?.map((l) => ({
        url: l.replace("mailto:", ""),
        linkType: "",
        linkLabel: "",
        inHeader: true,
        iconUrl: undefined,
      })) ?? []),
      ...normalizedJsonLinks,
    ],
  };
}

function transformToLinks(data: FormData): Pick<Artist, "linksJson" | "links"> {
  return {
    linksJson: data.linkArray.map((link) => {
      const trimmedLinkType = link.linkType?.trim();
      const matchingSite = trimmedLinkType
        ? outsideLinks.find((site) => site.name === trimmedLinkType)
        : undefined;
      const allowsCustomIcon = !matchingSite || matchingSite.matches === "";

      const sanitizedIconUrl = link.iconUrl?.trim();

      const sanitizedLink: Link = {
        ...link,
        linkType: trimmedLinkType ?? "",
      };

      if (allowsCustomIcon && sanitizedIconUrl) {
        sanitizedLink.iconUrl = sanitizedIconUrl;
      } else {
        delete sanitizedLink.iconUrl;
      }

      return sanitizedLink;
    }),
    links: [],
  };
}

const websiteSite = outsideLinks.find((site) => site.matches === "");
const DEFAULT_WEBSITE_NAME = websiteSite?.name ?? "Website";

const normalizeUrlInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return linkUrlHref(trimmed);
};

const allowsCustomIconForLinkType = (linkType?: string) => {
  if (!linkType) {
    return true;
  }
  const matchingSite = outsideLinks.find((site) => site.name === linkType);
  return !matchingSite || matchingSite.matches === "";
};

const resolveFaviconUrl = async (url: string): Promise<string | undefined> => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return undefined;
  }

  if (
    typeof window === "undefined" ||
    typeof Image === "undefined" ||
    isEmailLink(trimmedUrl)
  ) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const faviconUrl = `https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico`;

    const isValid = await new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = faviconUrl;
    });

    return isValid ? faviconUrl : undefined;
  } catch {
    return undefined;
  }
};

const ArtistFormLinks: React.FC<ArtistFormLinksProps> = ({
  artist,
  isManage,
  onSubmit,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useForm<FormData>({
    values: transformFromLinks(artist),
  });
  const { register, control, watch, handleSubmit, reset, setValue, getValues } =
    methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "linkArray",
  });

  const allLinks = transformFromLinks(artist).linkArray;
  const links = isManage ? allLinks : allLinks.filter((l) => l.inHeader);

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(transformToLinks(data));
      snackbar(t("updatedLinks"), { type: "success" });
      setIsOpen(false);
    },
    [onSubmit, snackbar]
  );

  const handleInputElBlur = React.useCallback(
    async (val: string, index: number) => {
      const normalizedUrl = normalizeUrlInput(val);

      if (!normalizedUrl) {
        setValue(`linkArray.${index}.url`, "");
        setValue(`linkArray.${index}.linkType`, "");
        setValue(`linkArray.${index}.iconUrl`, undefined);
        return;
      }

      setValue(`linkArray.${index}.url`, normalizedUrl);

      const newVal = findOutsideSite({ url: normalizedUrl, linkType: "" }).name;
      setValue(`linkArray.${index}.linkType`, newVal);

      if (!allowsCustomIconForLinkType(newVal)) {
        setValue(`linkArray.${index}.iconUrl`, undefined);
        return;
      }

      setValue(`linkArray.${index}.iconUrl`, undefined);
      const iconUrl = await resolveFaviconUrl(normalizedUrl);

      if (getValues(`linkArray.${index}.url`) !== normalizedUrl) {
        return;
      }

      if (
        !allowsCustomIconForLinkType(getValues(`linkArray.${index}.linkType`))
      ) {
        return;
      }

      if (iconUrl) {
        setValue(`linkArray.${index}.iconUrl`, iconUrl);
      }
    },
    [getValues, setValue]
  );

  return (
    <>
      <div className="flex align-center mb-2 max-w-full pr-2 pl-2">
        <div
          className={css`
            max-width: 100%;
            overflow: scroll;
            display: flex;
            justify-content: flex-start;
            align-items: center;

            ::-webkit-scrollbar {
              width: 0;
              height: 3px;
            }
            ::-webkit-scrollbar-track {
              background-color: inset 0 0 0px rgba(0, 0, 0);
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb {
              border-radius: 4px;
              background-color: rgba(100, 100, 100, 0.5);
            }

            a {
              display: inline-flex;
              align-items: center;
              margin-right: 0.75rem;

              > svg {
                margin-right: 0.5rem;
              }

              > img {
                margin-right: 0.5rem;
              }
            }

            a:last-child {
              margin-right: 0;
            }

            @media screen and (max-width: ${bp.medium}px) {
              padding: var(--mi-side-paddings-xsmall);
              padding-bottom: 0.5rem;
            }
          `}
        >
          {links
            .slice()
            .sort((l) => (findOutsideSite(l).showFull ? 1 : -1))
            .map((l) => {
              const site = findOutsideSite(l);
              return (
                <ArtistButtonAnchor
                  rel="me"
                  href={linkUrlHref(l.url, true)}
                  key={l.url}
                  variant="link"
                  startIcon={site?.icon}
                  target="_blank"
                  className={css`
                    display: inline-flex;
                    align-items: center;
                  `}
                >
                  {site.showFull ? l.linkLabel || l.url : ""}
                </ArtistButtonAnchor>
              );
            })}
          {!isManage && allLinks.length > links.length && (
            <ArtistButtonLink to="links" size="compact" variant="dashed">
              {t("moreLinks")}
            </ArtistButtonLink>
          )}
        </div>

        {isManage && (
          <div
            className={css`
              margin-left: 1rem;
            `}
          >
            <ArtistButton
              size="compact"
              variant="dashed"
              onClick={() => setIsOpen(true)}
              startIcon={<FaPen />}
            >
              {links?.length === 0 ? t("noLinksYet") : t("editLinks")}
            </ArtistButton>
          </div>
        )}
      </div>
      <Modal open={isOpen} size="small" onClose={() => setIsOpen(false)}>
        <FormProvider {...methods}>
          {fields.map((field, index) => {
            const linkValue = watch(`linkArray.${index}`) as Link | undefined;
            const site = linkValue ? findOutsideSite(linkValue) : undefined;
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

                  > img {
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
                      "checkbox checkbox";
                  }

                  .link-wrapper label {
                    text-align: right;
                  }
                `}
              >
                <div className="link-wrapper">
                  <label
                    className={css`
                      grid-area: iconLabel;
                    `}
                    htmlFor={`linkIcon${index}`}
                  >
                    {t("linkIcon")}
                  </label>
                  <div id={`linkIcon${index}`}>
                    <SelectEl {...register(`linkArray.${index}.linkType`)}>
                      {outsideLinks
                        .slice()
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
                          <option key={site.name}>
                            {t(site.name, site.name)}
                          </option>
                        ))}
                    </SelectEl>
                    &nbsp;{site?.icon}
                  </div>
                  <label
                    className={css`
                      grid-area: nameLabel;
                    `}
                    htmlFor={`linkLabel${index}`}
                  >
                    {t("linkLabel")}
                  </label>
                  <InputEl
                    className={css`
                      grid-area: nameInput;
                    `}
                    id={`linkLabel${index}`}
                    {...register(`linkArray.${index}.linkLabel`, {
                      onBlur: (e) =>
                        setValue(`linkArray.${index}.linkType`, e.target.value),
                    })}
                    placeholder={t("linkLabel") ?? ""}
                  />
                  <label
                    className={css`
                      grid-area: urlLabel;
                    `}
                    htmlFor={`linkUrl${index}`}
                  >
                    {t("url")}
                  </label>
                  <InputEl
                    className={css`
                      grid-area: urlInput;
                    `}
                    id={`linkUrl${index}`}
                    {...register(`linkArray.${index}.url`, {
                      setValueAs: normalizeUrlInput,
                      onBlur: (e) => {
                        void handleInputElBlur(e.target.value, index);
                      },
                    })}
                    placeholder={t("linkPlaceholder") ?? ""}
                    key={field.id}
                    type="url"
                  />
                  <FormComponent
                    className={css`
                      grid-area: checkbox;
                    `}
                    style={{ display: "flex" }}
                  >
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
                  iconUrl: undefined,
                })
              }
              startIcon={<FaPlus />}
            >
              {t("addNewLink")}
            </Button>
            <Button
              size="compact"
              startIcon={<FaSave />}
              onClick={handleSubmit(handleSave)}
            >
              {t("saveLinks")}
            </Button>
            <Button
              size="compact"
              startIcon={<FaTimes />}
              onClick={() => {
                reset();
                setIsOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </FormProvider>
      </Modal>
    </>
  );
};

export default ArtistFormLinks;
