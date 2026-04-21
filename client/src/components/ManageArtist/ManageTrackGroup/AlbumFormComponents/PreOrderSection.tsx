import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Toggle } from "components/common/Toggle";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/ManageTrackGroup";
import { CheckBoxLabel } from "components/common/FormCheckbox";
import { InputEl } from "components/common/Input";
import { Modal } from "components/common/Modal";
import Button from "components/common/Button";
import api from "services/api";
import { useBulkSetTracksIsPreviewMutation } from "queries/trackGroups";
import useErrorHandler from "services/useErrorHandler";

const PreOrderSection: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
  hasReleaseDate: boolean;
}> = ({ existingObject, reload, hasReleaseDate }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { artistId, trackGroupId } = useParams();
  const { watch } = useFormContext();
  const errorHandler = useErrorHandler();
  const releaseDateValue = watch("releaseDate");
  const { mutateAsync: bulkSetTracksIsPreview } =
    useBulkSetTracksIsPreviewMutation();

  const isPreorder = existingObject.isPreorder;
  const scheduleOnReleaseDate = existingObject.scheduleEndOnReleaseDate;
  const makePreviewableOnRelease =
    existingObject.makeTracksPreviewableOnRelease;
  const isPublished =
    existingObject.publishedAt &&
    new Date(existingObject.publishedAt) <= new Date();

  const prevHasReleaseDate = React.useRef(hasReleaseDate);
  React.useEffect(() => {
    const wasTrue = prevHasReleaseDate.current;
    prevHasReleaseDate.current = hasReleaseDate;

    if (wasTrue && !hasReleaseDate && scheduleOnReleaseDate) {
      api
        .put(`manage/trackGroups/${trackGroupId}`, {
          scheduleEndOnReleaseDate: false,
          makeTracksPreviewableOnRelease: false,
          artistId: Number(artistId),
        })
        .then(() => reload())
        .catch((e) => errorHandler(e));
    }
  }, [hasReleaseDate]);

  const [showEndModal, setShowEndModal] = React.useState(false);
  const [showNoDateModal, setShowNoDateModal] = React.useState(false);
  const [makeTracksPreviewable, setMakeTracksPreviewable] =
    React.useState(false);

  const updateField = async (data: Record<string, unknown>) => {
    try {
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        ...data,
        artistId: Number(artistId),
      });
      reload();
    } catch (e) {
      errorHandler(e);
      reload();
    }
  };

  const handlePreorderToggle = async (enabled: boolean) => {
    try {
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        isPreorder: enabled,
        ...(!enabled && {
          scheduleEndOnReleaseDate: false,
          makeTracksPreviewableOnRelease: false,
        }),
        artistId: Number(artistId),
      });
      await bulkSetTracksIsPreview({
        trackGroupId: Number(trackGroupId),
        isPreview: !enabled,
      });
      reload();
    } catch (e) {
      errorHandler(e);
    }
  };

  const handleEndPreorder = async () => {
    try {
      await api.post(`manage/trackGroups/${trackGroupId}/endPreorder`, {
        makeTracksPreviewable,
      });
      setShowEndModal(false);
      setMakeTracksPreviewable(false);
      reload();
    } catch (e) {
      errorHandler(e);
    }
  };

  const handleScheduleToggle = async (checked: boolean) => {
    if (checked && !hasReleaseDate) {
      setShowNoDateModal(true);
      return;
    }
    await updateField({
      scheduleEndOnReleaseDate: checked,
      ...(!checked && { makeTracksPreviewableOnRelease: false }),
    });
  };

  const handlePreviewableToggle = async (checked: boolean) => {
    await updateField({ makeTracksPreviewableOnRelease: checked });
  };

  return (
    <FormSection>
      <h2>{t("preOrder")}</h2>
      <div className="flex flex-col gap-4">
        <Toggle
          label={t("setupAsPreorder")}
          toggled={isPreorder}
          onClick={handlePreorderToggle}
        />

        {isPreorder && (
          <>
            <small>
              <Trans
                i18nKey="manageAlbum.preorderTrackInfo"
                components={{ strong: <strong /> }}
              />
            </small>
            <div className="ml-4 flex flex-col gap-4">
              <div className="flex items-start gap-2 p-1">
                <InputEl
                  id="input-schedule-preorder-release"
                  aria-describedby="hint-schedule-preorder-release"
                  type="checkbox"
                  checked={scheduleOnReleaseDate}
                  onChange={(e) => handleScheduleToggle(e.target.checked)}
                  className="mt-0.5 w-8 shrink-0"
                />
                <div>
                  <label htmlFor="input-schedule-preorder-release">
                    {t("schedulePreorderReleaseDate")}
                  </label>
                  <small
                    id="hint-schedule-preorder-release"
                    className="block mt-1"
                  >
                    <Trans
                      i18nKey="manageAlbum.schedulePreorderNotPublicationHint"
                      components={{ strong: <strong /> }}
                    />
                  </small>
                </div>
              </div>

              {scheduleOnReleaseDate && (
                <div className="flex items-start gap-2 p-1">
                  <InputEl
                    id="input-make-tracks-previewable-on-release"
                    type="checkbox"
                    checked={makePreviewableOnRelease}
                    onChange={(e) => handlePreviewableToggle(e.target.checked)}
                    className="mt-0.5 w-8 shrink-0"
                  />
                  <label htmlFor="input-make-tracks-previewable-on-release">
                    {t("setTracksAsFreeListen")}
                  </label>
                </div>
              )}

              {scheduleOnReleaseDate && hasReleaseDate && (
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <div className="w-fit rounded border border-black/10 bg-(--mi-lighten-background-color) p-3 opacity-80">
                    <label
                      htmlFor="input-preorder-release-date"
                      className="text-sm text-(--mi-neutral-500)"
                    >
                      {t("currentReleaseDate")}
                    </label>
                    <InputEl
                      id="input-preorder-release-date"
                      type="date"
                      value={releaseDateValue}
                      disabled
                      aria-describedby="hint-preorder-release-date"
                      className="mt-1 opacity-60"
                    />
                    <small id="hint-preorder-release-date" className="sr-only">
                      {t("releaseDateScheduledHint")}
                    </small>
                  </div>
                  <small className="flex-1 mt-1">
                    {t("releaseDatePreorderHint")}
                  </small>
                </div>
              )}
            </div>

            <Button
              className="self-start"
              onClick={() => setShowEndModal(true)}
            >
              {t("endPreorderCampaign")}
            </Button>
            <small className="ml-1 block">{t("releasePreorderHint")}</small>
          </>
        )}
      </div>

      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title={t("endPreorderCampaign")}
      >
        {isPublished ? (
          <div className="flex flex-col gap-4">
            <p>{t("endPreorderConfirmation")}</p>
            <CheckBoxLabel htmlFor="input-make-tracks-previewable">
              <InputEl
                id="input-make-tracks-previewable"
                type="checkbox"
                checked={makeTracksPreviewable}
                onChange={(e) => setMakeTracksPreviewable(e.target.checked)}
              />
              {t("makeTracksPreviewableOnRelease")}
            </CheckBoxLabel>
            <div className="flex gap-2">
              <Button onClick={handleEndPreorder}>
                {t("confirmEndPreorder")}
              </Button>
              <Button onClick={() => setShowEndModal(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p>{t("endPreorderNotPublished")}</p>
            <Button onClick={() => setShowEndModal(false)}>
              {t("cancel")}
            </Button>
          </div>
        )}
      </Modal>
      <Modal
        open={showNoDateModal}
        onClose={() => setShowNoDateModal(false)}
        title={t("schedulePreorderReleaseDate")}
      >
        <div className="flex flex-col gap-4">
          <p>{t("noReleaseDateSet")}</p>
          <Button onClick={() => setShowNoDateModal(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Modal>
    </FormSection>
  );
};

export default PreOrderSection;
