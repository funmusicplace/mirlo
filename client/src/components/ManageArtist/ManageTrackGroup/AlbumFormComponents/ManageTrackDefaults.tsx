import { css } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { openOutsideLinkAfter } from "components/Merch/IncludesDigitalDownload";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import SavingInput from "./SavingInput";

interface BulkUpdateTracksProps {
  trackGroup: TrackGroup;
  reload: () => void;
}

const ToggleFormComponent = styled("div")`
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  flex-direction: row;
`;

const ManageTrackDefaults: React.FC<BulkUpdateTracksProps> = ({
  trackGroup,
  reload,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<TrackGroup>({ defaultValues: trackGroup });
  const { colors } = useGetArtistColors();
  const snackbar = useSnackbar();

  const handleSetAllTracksPreview = async (isPreview: boolean) => {
    try {
      await Promise.all(
        (trackGroup.tracks ?? []).map((track) =>
          api.put(`manage/tracks/${track.id}`, { isPreview })
        )
      );
      await api.put(`manage/trackGroups/${trackGroup.id}`, {
        defaultIsPreview: isPreview,
      });
      snackbar(t("updatedAllTracks"), { type: "success" });
      reload();
    } catch (e) {
      console.error("Error updating tracks:", e);
    }
  };

  return (
    <div>
      <FormProvider {...methods}>
        <ToggleFormComponent>
          <SavingInput
            type="checkbox"
            formKey="defaultAllowMirloPromo"
            url={`manage/trackGroups/${trackGroup.id}`}
            timer={0}
            width="auto"
          />
          <label htmlFor="allowMirloPromo">
            <Trans
              t={t}
              i18nKey={"allowMirloPromo"}
              components={{
                hype: (
                  <Link
                    className={openOutsideLinkAfter}
                    to="/team/posts/236/"
                    target="_blank"
                  ></Link>
                ),
              }}
            />
          </label>
        </ToggleFormComponent>
      </FormProvider>
      {(trackGroup.tracks ?? []).length > 0 && (
        <div
          className={css`
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            padding: 0.5rem 0;
          `}
        >
          <ArtistButton
            colors={colors}
            onClick={() => handleSetAllTracksPreview(true)}
          >
            {t("setAllTracksAsPreview")}
          </ArtistButton>
          <ArtistButton
            colors={colors}
            variant="dashed"
            onClick={() => handleSetAllTracksPreview(false)}
          >
            {t("setAllTracksAsMustOwn")}
          </ArtistButton>
        </div>
      )}
    </div>
  );
};

export default ManageTrackDefaults;
