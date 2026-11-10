import { ArtistButton } from "components/Artist/ArtistButtons";
import { useDeleteFundraiserMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

const RemoveFundraiserButton: React.FC<{
  fundraiserId: number;
  pledgeCount: number;
  onRemoved: () => void;
}> = ({ fundraiserId, pledgeCount, onRemoved }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const { mutateAsync: deleteFundraiser, isPending } =
    useDeleteFundraiserMutation();
  const hasPledges = pledgeCount > 0;

  const onRemove = async () => {
    if (
      hasPledges &&
      !window.confirm(
        t("removingFundraiserWithPledgesWarning", { count: pledgeCount })
      )
    ) {
      return;
    }
    try {
      await deleteFundraiser(fundraiserId);
      snackbar(t("fundraiserRemoved"), { type: "success" });
      onRemoved();
    } catch (e) {
      console.error(e);
      snackbar(t("removalFailed"), { type: "warning" });
    }
  };

  return (
    <ArtistButton
      type="button"
      variant="dashed"
      onClick={onRemove}
      isLoading={isPending}
      startIcon={<FaTrash />}
      className="self-start"
    >
      {t(hasPledges ? "cancelFundraiser" : "removeFundraiser")}
    </ArtistButton>
  );
};

export default RemoveFundraiserButton;
