import { css } from "@emotion/css";
import styled from "@emotion/styled";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { bp } from "../../../constants";

import { FormSettings } from "./settingsForm";

const colorInputClass = css`
  &[type="color"] {
    min-height: 2.5rem;
    padding: 2px;
  }

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: calc(var(--mi-border-radius) - 2px);
  }

  &::-moz-color-swatch {
    border: 0;
    border-radius: calc(var(--mi-border-radius) - 2px);
  }
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const COLOR_FIELDS = [
  { key: "button", labelKey: "colorButton" },
  { key: "buttonText", labelKey: "colorButtonText" },
  { key: "text", labelKey: "colorText" },
  { key: "background", labelKey: "colorBackground" },
] as const;

const GeneralSettingsSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <fieldset id="settings-general" className="mb-8 scroll-mt-32">
      <legend className="mb-4 w-full border-b border-(--mi-tint-x-color) pb-2 text-lg font-semibold">
        {t("generalSettings")}
      </legend>

      <FormComponent>
        <label htmlFor="input-platform-percent">{t("platformPercent")}</label>
        <InputEl
          id="input-platform-percent"
          type="number"
          className="max-w-xs"
          {...register("platformPercent")}
        />
      </FormComponent>

      <FormComponent>
        <label htmlFor="input-cdn-url">{t("cdnUrl")}</label>
        <InputEl
          id="input-cdn-url"
          type="text"
          className="max-w-md"
          {...register("cdnUrl")}
        />
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-is-closed-to-public-artist-signup"
          type="checkbox"
          aria-describedby="hint-is-closed-to-public-artist-signup"
          {...register("isClosedToPublicArtistSignup")}
        />
        <div className="flex flex-col">
          <label htmlFor="input-is-closed-to-public-artist-signup">
            {t("isClosedToPublicArtistSignup")}
          </label>
          <small id="hint-is-closed-to-public-artist-signup">
            <Trans
              t={t}
              i18nKey="isClosedToPublicArtistSignupHint"
              components={{ invitesLink: <Link to="/admin/content/invites" /> }}
            />
          </small>
        </div>
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-show-queue-dashboard"
          type="checkbox"
          {...register("showQueueDashboard")}
        />
        <label htmlFor="input-show-queue-dashboard">
          {t("showQueueDashboard")}
        </label>
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-show-hero-on-home"
          type="checkbox"
          {...register("instanceCustomization.showHeroOnHome")}
        />
        <label htmlFor="input-show-hero-on-home">{t("showHeroOnHome")}</label>
      </FormComponent>

      <FormComponent>
        <label htmlFor="input-instance-artist-id">
          {t("instanceArtistId")}
        </label>
        <InputEl
          id="input-instance-artist-id"
          type="number"
          className="max-w-xs"
          {...register("instanceCustomization.artistId")}
        />
      </FormComponent>

      <fieldset>
        <legend className="mb-2 font-semibold">{t("colors")}</legend>
        <ColorGrid>
          {COLOR_FIELDS.map(({ key, labelKey }) => (
            <FormComponent key={key}>
              <label htmlFor={`input-color-${key}`}>{t(labelKey)}</label>
              <InputEl
                id={`input-color-${key}`}
                type="color"
                className={colorInputClass}
                {...register(`instanceCustomization.colors.${key}`)}
              />
            </FormComponent>
          ))}
        </ColorGrid>
      </fieldset>
    </fieldset>
  );
};

export default GeneralSettingsSection;
