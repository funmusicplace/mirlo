import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistButton } from "components/Artist/ArtistButtons";
import {
  useArtistColorsPreview,
  useTransparentContainerPreview,
} from "components/ArtistColorsProvider";
import { InputEl } from "components/common/Input";
import { Toggle } from "components/common/Toggle";
import { useForcedColors } from "utils/useForcedColors";
import { useHighContrast } from "utils/useHighContrast";
import { useProfileMutation, useUpdateArtistMutation } from "queries";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { sampleForcedColorsPalette } from "utils/sampleForcedColorsPalette";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import ColorInput from "./ColorInput";

const ColorInputWrapper = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
`;

const ArtistFormColors: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { user, refreshLoggedInUser } = useAuthContext();
  const { data: artist } = useManagedArtistQuery();
  const setPreview = useArtistColorsPreview();
  const setTransparentPreview = useTransparentContainerPreview();
  const accountHighContrast = useHighContrast();
  const forcedColors = useForcedColors();
  const { mutateAsync: updateArtist, isPending } = useUpdateArtistMutation();
  const { mutateAsync: updateProfile, isPending: isSavingHcPref } =
    useProfileMutation();

  const { control, getValues, setValue, formState, register } = useFormContext<{
    properties: { colors?: ArtistColors; transparentContainer?: boolean };
  }>();

  const watchedColors = useWatch({ control, name: "properties.colors" });
  const watchedTransparent = useWatch({
    control,
    name: "properties.transparentContainer",
  });
  React.useEffect(() => {
    setPreview(watchedColors ?? null);
  }, [watchedColors, setPreview]);
  React.useEffect(() => {
    setTransparentPreview(watchedTransparent ?? null);
  }, [watchedTransparent, setTransparentPreview]);
  React.useEffect(() => {
    return () => {
      setPreview(null);
      setTransparentPreview(null);
    };
  }, [setPreview, setTransparentPreview]);

  const colorsDirty =
    Boolean(formState.dirtyFields.properties?.colors) ||
    Boolean(formState.dirtyFields.properties?.transparentContainer);

  const hcOnForThisArtist = Boolean(
    artist && !user?.properties?.highContrastOffArtistIds?.includes(artist.id)
  );

  const onToggleArtistHighContrast = async (enabled: boolean) => {
    if (!user || !artist) return;
    const current = user.properties?.highContrastOffArtistIds ?? [];
    const nextIds = enabled
      ? current.filter((id) => id !== artist.id)
      : Array.from(new Set([...current, artist.id]));
    try {
      await updateProfile({
        userId: user.id,
        properties: {
          ...(user.properties ?? {}),
          highContrastOffArtistIds: nextIds,
        },
      });
      await refreshLoggedInUser();
      snackbar(
        t(enabled ? "highContrastArtistOnSaved" : "highContrastArtistOffSaved"),
        { type: "success" }
      );
    } catch {
      snackbar(t("highContrastArtistSaveError"), { type: "warning" });
    }
  };

  const onUseBrowserOsColors = () => {
    const sampled = sampleForcedColorsPalette();
    setValue("properties.colors", sampled, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onSaveColors = async () => {
    if (!user || !artist) return;
    try {
      const colors = getValues("properties.colors") ?? {};
      const transparentContainer =
        getValues("properties.transparentContainer") ?? false;
      await updateArtist({
        userId: user.id,
        artistId: artist.id,
        body: {
          properties: {
            ...artist.properties,
            colors,
            transparentContainer,
          },
        },
      });
      setValue("properties.colors", colors, {
        shouldDirty: false,
        shouldTouch: false,
      });
      setValue("properties.transparentContainer", transparentContainer, {
        shouldDirty: false,
        shouldTouch: false,
      });
      snackbar(t("colorsSaved"), { type: "success" });
    } catch {
      snackbar(t("colorsSaveError"), { type: "warning" });
    }
  };

  const onCancel = () => {
    setValue("properties.colors", artist?.properties?.colors ?? {}, {
      shouldDirty: false,
      shouldTouch: false,
    });
    setValue(
      "properties.transparentContainer",
      artist?.properties?.transparentContainer ?? false,
      {
        shouldDirty: false,
        shouldTouch: false,
      }
    );
  };

  if (!artist) return null;

  return (
    <fieldset>
      <legend>{t("customColors")}</legend>

      <ColorInputWrapper>
        {accountHighContrast &&
          (forcedColors ? (
            <div>
              <ArtistButton
                type="button"
                variant="outlined"
                onClick={onUseBrowserOsColors}
              >
                {t("useBrowserOsContrastColors")}
              </ArtistButton>
              <small
                className={css`
                  display: block;
                  margin-top: 0.25rem;
                `}
              >
                {t("useBrowserOsContrastColorsDescription")}
              </small>
            </div>
          ) : (
            <div>
              <Toggle
                id="input-high-contrast-this-artist"
                ariaDescribedBy="hint-high-contrast-this-artist"
                label={t("highContrastForThisArtist")}
                toggled={hcOnForThisArtist}
                onClick={(on) => {
                  void onToggleArtistHighContrast(on);
                }}
              />
              <small
                id="hint-high-contrast-this-artist"
                className={css`
                  display: block;
                  margin-top: 0.25rem;
                `}
              >
                {t("highContrastForThisArtistDescription")}
              </small>
            </div>
          ))}
        <ColorInput
          name="properties.colors.background"
          title={t("backgroundColor")}
        />
        <div>
          <label
            htmlFor="input-transparent-container"
            className={css`
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            `}
          >
            <InputEl
              id="input-transparent-container"
              type="checkbox"
              aria-describedby="hint-transparent-container"
              {...register("properties.transparentContainer")}
            />
            <span>{t("transparentContainer")}</span>
          </label>
          <small
            id="hint-transparent-container"
            className={css`
              display: block;
              margin-top: 0.25rem;
            `}
          >
            {t("transparentContainerDescription")}
          </small>
        </div>
        <ColorInput name="properties.colors.text" title={t("textColor")} />
        <ColorInput
          name="properties.colors.secondaryText"
          title={t("secondaryTextColor")}
        />
        <ColorInput name="properties.colors.button" title={t("buttonColor")} />
        <ColorInput
          name="properties.colors.buttonText"
          title={t("buttonTextColor")}
        />
      </ColorInputWrapper>
      <div
        className={css`
          display: flex;
          gap: 0.5rem;
        `}
      >
        <ArtistButton
          type="button"
          onClick={onSaveColors}
          disabled={!colorsDirty || isPending || isSavingHcPref}
          isLoading={isPending}
        >
          {t("saveColors")}
        </ArtistButton>
        <ArtistButton
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={!colorsDirty || isPending || isSavingHcPref}
        >
          {t("cancelColors")}
        </ArtistButton>
      </div>
    </fieldset>
  );
};

export default ArtistFormColors;
