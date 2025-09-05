import React from "react";

import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import FormComponent from "components/common/FormComponent";

import AutoCompleteTrackGroup from "components/common/AutoCompleteTrackGroup";
import api from "services/api";
import Pill from "components/common/Pill";
import { css } from "@emotion/css";
import { FaTimes } from "react-icons/fa";
import { hasId } from "../ManageTrackGroup/AlbumFormComponents/ManageTags";
import LoadingSpinner from "components/common/LoadingSpinner";
import { ArtistButton } from "components/Artist/ArtistButtons";

const SelectTrackGroup: React.FC<{
  merch: Merch;
  reload: () => void;
}> = ({ merch, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentTrackGroup, setCurrentTrackGroup] = React.useState<
    TrackGroup | undefined
  >(merch.includePurchaseTrackGroup);

  const doSave = React.useCallback(
    async (val: number | null) => {
      try {
        if (typeof val === "number" || val === null) {
          setIsSaving(true);
          const response = await api.put<Partial<Merch>, { result: Merch }>(
            `manage/merch/${merch.id}`,
            {
              includePurchaseTrackGroupId: val,
            }
          );
          setCurrentTrackGroup(response.result.includePurchaseTrackGroup);
          snackbar(t("merchUpdated"), {
            type: "success",
          });
        }
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsSaving(false);
        await reload();
      }
    },
    [t, merch, snackbar, errorHandler, reload]
  );

  return (
    <FormComponent>
      <label>{t("relatedToTrackGroup")}</label>
      {currentTrackGroup && (
        <Pill
          className={css`
            margin: 0.5rem 0 1rem;
          `}
        >
          {currentTrackGroup.title}
          <ArtistButton
            startIcon={<FaTimes />}
            variant="dashed"
            onClick={() => doSave(null)}
            className={css`
              cursor: pointer;
            `}
          />
        </Pill>
      )}
      <div
        className={css`
          display: flex;
        `}
      >
        <AutoCompleteTrackGroup
          onSelect={(val) => doSave(val)}
          filterByArtistId={merch.artistId}
          placeholder={t("typeAlbumName") ?? ""}
        />
        {isSaving && <LoadingSpinner size="small" />}
      </div>
      <small
        className={css`
          margin-top: 1rem;
        `}
      >
        {t("relatedTrackGroupSmall")}
      </small>
    </FormComponent>
  );
};

export default SelectTrackGroup;
