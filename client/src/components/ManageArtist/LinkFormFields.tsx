import FormCheckbox from "components/common/FormCheckbox";
import { InputEl } from "components/common/Input";
import {
  findOutsideSite,
  isEmailLink,
  linkUrlHref,
  outsideLinks,
} from "components/common/LinkIconDisplay";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const normalizeUrlInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return linkUrlHref(trimmed);
};

export const allowsCustomIconForLinkType = (linkType?: string) => {
  if (!linkType) {
    return true;
  }
  const matchingSite = outsideLinks.find((site) => site.name === linkType);
  return !matchingSite;
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

    // We disqualify 48x48 to skip the placeholder DuckDuckGo returns when the site has no favicon.
    const isValid = await new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const isPlaceholder =
          image.naturalWidth === 48 && image.naturalHeight === 48;
        resolve(!isPlaceholder);
      };
      image.onerror = () => resolve(false);
      image.src = faviconUrl;
    });

    return isValid ? faviconUrl : undefined;
  } catch {
    return undefined;
  }
};

const LinkFormFields: React.FC = () => {
  const { register, watch, setValue, getValues } = useFormContext<Link>();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const linkValue = watch();
  const site = findOutsideSite(linkValue);

  const handleUrlBlur = React.useCallback(
    async (val: string) => {
      const normalizedUrl = normalizeUrlInput(val);

      if (!normalizedUrl) {
        setValue("url", "");
        setValue("linkType", "");
        setValue("iconUrl", undefined);
        return;
      }

      setValue("url", normalizedUrl);

      const found = findOutsideSite({ url: normalizedUrl, linkType: "" });
      const newVal = found.isFallback ? "" : found.name;
      setValue("linkType", newVal);

      if (!allowsCustomIconForLinkType(newVal)) {
        setValue("iconUrl", undefined);
        return;
      }

      setValue("iconUrl", undefined);
      const iconUrl = await resolveFaviconUrl(normalizedUrl);

      if (getValues("url") !== normalizedUrl) {
        return;
      }

      if (!allowsCustomIconForLinkType(getValues("linkType"))) {
        return;
      }

      if (iconUrl) {
        setValue("iconUrl", iconUrl);
      }
    },
    [getValues, setValue]
  );

  const sectionLabelClass =
    "block text-sm text-(--mi-secondary-text-color) mb-1";
  const sectionClass = "py-4";
  const hrClass = "border-0 border-t border-(--mi-tint-color) m-0";

  return (
    <div className="flex flex-col">
      <section className={`${sectionClass} flex flex-col gap-3`}>
        <div>
          <label htmlFor="input-linkType" className={sectionLabelClass}>
            {t("linkIcon")}
          </label>
          <div className="flex items-center gap-2">
            <SelectEl
              id="input-linkType"
              {...register("linkType")}
              className="flex-1"
            >
              {outsideLinks
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <option key={s.name}>{t(s.name)}</option>
                ))}
            </SelectEl>
            {site?.icon}
          </div>
        </div>

        <div>
          <label htmlFor="input-linkLabel" className={sectionLabelClass}>
            {t("linkLabel")}
          </label>
          <InputEl
            id="input-linkLabel"
            {...register("linkLabel", {
              onBlur: (e) => {
                if (!getValues("linkType")) {
                  setValue("linkType", e.target.value);
                }
              },
            })}
            placeholder={t("linkLabel")}
          />
        </div>

        <div>
          <label htmlFor="input-url" className={sectionLabelClass}>
            {t("url")}
          </label>
          <InputEl
            id="input-url"
            {...register("url", {
              setValueAs: normalizeUrlInput,
              onBlur: (e) => {
                void handleUrlBlur(e.target.value);
              },
            })}
            placeholder={t("linkPlaceholder")}
            type="url"
          />
        </div>
      </section>

      <hr className={hrClass} />

      <section className={sectionClass}>
        <FormCheckbox
          keyName="inHeader"
          description={t("linkInHeader")}
          hint={t("linkInHeaderHint")}
        />
      </section>
    </div>
  );
};

export default LinkFormFields;
