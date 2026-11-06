import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import {
  LabelRemovalSide,
  labelRemovalUrl,
  queryLabelRemovalImpact,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const RemoveLabelButton: React.FC<{
  side: LabelRemovalSide;
  artistId: number;
  labelUserId: number;
  artistName: string;
  labelName: string;
  onRemoved: () => void;
}> = ({ side, artistId, labelUserId, artistName, labelName, onRemoved }) => {
  const { t } = useTranslation("translation", { keyPrefix: "labelRemoval" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const { data: impact } = useQuery({
    ...queryLabelRemovalImpact({ side, artistId, labelUserId }),
    enabled: isOpen,
  });

  const names = {
    artistName,
    labelName,
    newPayeeName: impact?.newPayeeName,
  };

  const onConfirm = async () => {
    setIsPending(true);
    try {
      await api.delete(labelRemovalUrl(side, artistId, labelUserId));
      snackbar(t(side === "artist" ? "labelRemoved" : "artistRemoved", names), {
        type: "success",
      });
      setIsOpen(false);
      onRemoved();
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button size="compact" variant="link" onClick={() => setIsOpen(true)}>
        {t("remove")}
      </Button>
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t(
          side === "artist" ? "removeLabelTitle" : "removeArtistTitle",
          names
        )}
        size="small"
      >
        <div className="flex flex-col gap-3">
          <p>
            {t(side === "artist" ? "labelLosesAccess" : "youLoseAccess", names)}
          </p>
          {impact &&
            (impact.trackGroups.length > 0 ? (
              <>
                <p>
                  {t("releasesChangePayee", {
                    ...names,
                    count: impact.trackGroups.length,
                  })}
                </p>
                <ul className="list-disc pl-6">
                  {impact.trackGroups.map((tg) => (
                    <li key={tg.id}>{tg.title}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>{t("noReleasesChange", names)}</p>
            ))}
          {impact?.isArtistPayee && <p>{t("artistPayeeChanges", names)}</p>}
          {!!impact?.activeSubscriptionCount && (
            <p className="font-semibold">
              {t("subscriptionsStay", {
                ...names,
                count: impact.activeSubscriptionCount,
              })}
            </p>
          )}
          <Button
            size="compact"
            buttonRole="warning"
            isLoading={isPending}
            disabled={!impact}
            onClick={onConfirm}
          >
            {t(
              side === "artist" ? "confirmRemoveLabel" : "confirmRemoveArtist"
            )}
          </Button>
          <Button
            size="compact"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default RemoveLabelButton;
