import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { Modal } from "components/common/Modal";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { isTrackGroupPublished } from "utils/artist";

const SchedulePublication: React.FC<{
  existingObject: TrackGroup;
  reload: () => Promise<unknown>;
}> = ({ existingObject, reload }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const { artistId, trackGroupId } = useParams();
  const errorHandler = useErrorHandler();

  const [openModal, setOpenModal] = React.useState<
    "schedule" | "cancel" | null
  >(null);
  const [draftDate, setDraftDate] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const todayString = new Date().toISOString().split("T")[0];

  if (isTrackGroupPublished(existingObject)) {
    return null;
  }

  const scheduledDate =
    existingObject.publishedAt &&
    new Date(existingObject.publishedAt) > new Date()
      ? existingObject.publishedAt
      : null;

  const openScheduleModal = () => {
    setDraftDate("");
    setOpenModal("schedule");
  };

  const handleConfirmSchedule = async () => {
    if (!draftDate || !trackGroupId || !artistId) return;
    setIsSaving(true);
    try {
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        publishedAt: new Date(`${draftDate}T00:00:00`).toISOString(),
        artistId: Number(artistId),
      });
      await reload();
      setOpenModal(null);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!trackGroupId || !artistId) return;
    setIsSaving(true);
    try {
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        publishedAt: null,
        artistId: Number(artistId),
      });
      await reload();
      setOpenModal(null);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {scheduledDate ? (
        <>
          <span>
            {t("scheduledPublicationLabel", {
              date: formatDate({
                date: scheduledDate,
                options: { year: "numeric", month: "short", day: "numeric" },
                i18n,
              }),
            })}
          </span>
          <Button
            type="button"
            variant="link"
            onClick={() => setOpenModal("cancel")}
            className="!text-inherit"
          >
            {t("scheduledPublicationCancelButton")}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="link"
          onClick={openScheduleModal}
          className="!text-inherit opacity-60 hover:opacity-100"
        >
          {t("schedulePublicationLink")}
        </Button>
      )}

      <Modal
        open={openModal === "schedule"}
        onClose={() => setOpenModal(null)}
        title={t("schedulePublicationModalTitle")}
      >
        <div className="flex flex-col gap-4">
          <p id="hint-schedule-publication-date">
            {t("schedulePublicationModalBody")}
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-schedule-publication-date">
              {t("schedulePublicationDateLabel")}
            </label>
            <InputEl
              id="input-schedule-publication-date"
              type="date"
              min={todayString}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              aria-describedby="hint-schedule-publication-date"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={!draftDate || isSaving}
              isLoading={isSaving}
            >
              {t("schedulePublicationConfirm")}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setOpenModal(null)}
              disabled={isSaving}
            >
              {t("schedulePublicationCancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openModal === "cancel"}
        onClose={() => setOpenModal(null)}
        title={t("cancelSchedulePublicationModalTitle")}
      >
        <div className="flex flex-col gap-4">
          <p>{t("cancelSchedulePublicationModalBody")}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSaving}
              isLoading={isSaving}
            >
              {t("cancelSchedulePublicationConfirm")}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setOpenModal(null)}
              disabled={isSaving}
            >
              {t("cancelSchedulePublicationKeep")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchedulePublication;
