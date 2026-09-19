import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import Pill from "components/common/Pill";
import { SelectEl } from "components/common/Select";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

const ArtistPaymentReceiver: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const { mutateAsync: updateArtist, isPending } = useUpdateArtistMutation();
  const [chosenLabelUserId, setChosenLabelUserId] = React.useState("");

  const approvedLabels = (artist.artistLabels ?? []).filter(
    (al) => al.isArtistApproved && al.isLabelApproved
  );

  const currentReceiver = approvedLabels.find(
    (al) => al.labelUserId === artist.paymentToUserId
  );

  const setReceiver = React.useCallback(
    async (paymentToUserId: number | null) => {
      if (!user) {
        return;
      }
      try {
        await updateArtist({
          userId: user.id,
          artistId: artist.id,
          body: { paymentToUserId },
        });
        snackbar(t("paymentReceiverUpdated"), { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar(t("paymentReceiverUpdateFailed"), { type: "warning" });
      }
    },
    [artist.id, snackbar, t, updateArtist, user]
  );

  if (approvedLabels.length === 0 || !user) {
    return null;
  }

  return (
    <FormComponent>
      <label htmlFor="select-artist-payment-receiver">
        {t("artistPaymentReceiver")}
      </label>
      <small className="block mb-2">{t("artistPaymentReceiverHint")}</small>
      {currentReceiver && (
        <Pill variant="tint">
          {currentReceiver.labelUser.artists?.[0]?.name ??
            currentReceiver.labelUser.name}{" "}
          <ArtistButton
            variant="dashed"
            startIcon={<FaTimes />}
            isLoading={isPending}
            onClick={() => setReceiver(null)}
          />
        </Pill>
      )}
      {!currentReceiver && (
        <div className="flex flex-wrap gap-2 items-center">
          <SelectEl
            id="select-artist-payment-receiver"
            className="w-auto!"
            value={chosenLabelUserId}
            onChange={(e) => setChosenLabelUserId(e.target.value)}
          >
            <option value="">{t("chooseALabel")}</option>
            {approvedLabels.map((al) => (
              <option value={al.labelUserId} key={al.labelUserId}>
                {al.labelUser.artists?.[0]?.name ?? al.labelUser.name}
              </option>
            ))}
          </SelectEl>
          <ArtistButton
            type="button"
            variant="outlined"
            disabled={!chosenLabelUserId}
            isLoading={isPending}
            onClick={() => setReceiver(Number(chosenLabelUserId))}
          >
            {t("savePaymentReceiver")}
          </ArtistButton>
        </div>
      )}
    </FormComponent>
  );
};

export default ArtistPaymentReceiver;
