import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { Select } from "components/common/Select";
import { Toggle } from "components/common/Toggle";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaUserPlus } from "react-icons/fa";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const today = () => new Date().toISOString().slice(0, 10);

const ArtistAddSubscriber: React.FC<{
  artistId?: number;
  onDone: () => void;
}> = ({ artistId, onDone }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [tierId, setTierId] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [confirmedNoSpam, setConfirmedNoSpam] = React.useState(false);

  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const canImport = !!managedArtist?.canImportSubscribers;
  const { data: tiersData } = useQuery(
    queryManagedArtistSubscriptionTiers({ artistId })
  );
  const tiers = (tiersData?.results ?? []).filter(
    (tier) => !tier.isDefaultTier
  );
  const selectedTierId = tierId || String(tiers[0]?.id ?? "");

  const close = () => {
    setIsOpen(false);
    setName("");
    setEmail("");
    setExpiresOn("");
    setConfirmedNoSpam(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post(`manage/artists/${artistId}/subscribers`, {
        subscribers: [{ email, name }],
        artistSubscriptionTierId: Number(selectedTierId),
        expiresAt: expiresOn
          ? new Date(`${expiresOn}T23:59:59`).toISOString()
          : undefined,
        confirmedNoSpam,
      });
      snackbar(t("subscriberAdded"), { type: "success" });
      close();
      onDone();
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!artistId) {
    return null;
  }

  return (
    <>
      <Modal title={t("addSubscriber")} open={isOpen} onClose={close}>
        {!canImport ? (
          <p>{t("importNeedsVerifiedPayments")}</p>
        ) : tiers.length === 0 ? (
          <p>{t("addSubscriberNeedsTier")}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p>{t("addSubscriberDescription")}</p>
            <label className="flex flex-col gap-1">
              {t("name")}
              <InputEl value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              {t("email")}
              <InputEl
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              {t("tier")}
              <Select
                value={selectedTierId}
                onChange={(e) => setTierId(e.target.value)}
                options={tiers.map((tier) => ({
                  label: tier.name,
                  value: String(tier.id),
                }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              {t("expiresOn")}
              <InputEl
                type="date"
                min={today()}
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                aria-describedby="hint-subscriber-expires-on"
              />
              <small id="hint-subscriber-expires-on">
                {t("expiresOnHint")}
              </small>
            </label>
            <Toggle
              id="add-subscriber-confirm-no-spam"
              label={t("confirmNoSpam")}
              toggled={confirmedNoSpam}
              onClick={setConfirmedNoSpam}
            />
            <div>
              <Button
                type="submit"
                disabled={!confirmedNoSpam || !email}
                isLoading={isSaving}
              >
                {t("addSubscriber")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <li>
        <Button
          onClick={() => setIsOpen(true)}
          size="compact"
          startIcon={<FaUserPlus />}
        >
          {t("manuallyAddSubscriber")}
        </Button>
      </li>
    </>
  );
};

export default ArtistAddSubscriber;
