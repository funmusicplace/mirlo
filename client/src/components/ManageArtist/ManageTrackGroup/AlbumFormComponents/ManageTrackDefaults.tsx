import styled from "@emotion/styled";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { ArtistButton } from "components/Artist/ArtistButtons";
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
  const snackbar = useSnackbar();

  const handleSetAllTracksPreview = async (isPreview: boolean) => {
    try {
      await api.put<{ isPreview: boolean }, { result: TrackGroup }>(
        `manage/trackGroups/${trackGroup.id}/tracks`,
        { isPreview }
      );
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
            id="input-allow-mirlo-promo"
            type="checkbox"
            formKey="defaultAllowMirloPromo"
            url={`manage/trackGroups/${trackGroup.id}`}
            timer={0}
            width="auto"
          />
          <label htmlFor="input-allow-mirlo-promo">
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
        <div className="flex flex-wrap gap-4 py-2">
          <ArtistButton onClick={() => handleSetAllTracksPreview(true)}>
            {t("setAllTracksAsPreview")}
          </ArtistButton>
          <ArtistButton
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
