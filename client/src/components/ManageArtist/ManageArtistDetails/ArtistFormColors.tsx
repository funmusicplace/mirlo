import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { useArtistColorsPreview } from "components/ArtistColorsProvider";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
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
  const { user } = useAuthContext();
  const { data: artist } = useManagedArtistQuery();
  const setPreview = useArtistColorsPreview();
  const { mutateAsync: updateArtist, isPending } = useUpdateArtistMutation();

  const { control, getValues, setValue, formState } = useFormContext<{
    properties: { colors?: ArtistColors };
  }>();

  const watchedColors = useWatch({ control, name: "properties.colors" });
  React.useEffect(() => {
    setPreview(watchedColors ?? null);
  }, [watchedColors, setPreview]);
  React.useEffect(() => {
    return () => setPreview(null);
  }, [setPreview]);

  const colorsDirty = Boolean(formState.dirtyFields.properties?.colors);

  const onSaveColors = async () => {
    if (!user || !artist) return;
    try {
      const colors = getValues("properties.colors") ?? {};
      await updateArtist({
        userId: user.id,
        artistId: artist.id,
        body: {
          properties: {
            ...artist.properties,
            colors,
          },
        },
      });
      setValue("properties.colors", colors, {
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
  };

  if (!artist) return null;

  return (
    <fieldset>
      <legend>{t("customColors")}</legend>

      <ColorInputWrapper>
        <ColorInput
          name="properties.colors.background"
          title={t("backgroundColor")}
        />
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
          disabled={!colorsDirty || isPending}
          isLoading={isPending}
        >
          {t("saveColors")}
        </ArtistButton>
        <ArtistButton
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={!colorsDirty || isPending}
        >
          {t("cancelColors")}
        </ArtistButton>
      </div>
    </fieldset>
  );
};

export default ArtistFormColors;
