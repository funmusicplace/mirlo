import { css } from "@emotion/css";
import React from "react";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useParams } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button, { ButtonLink } from "components/common/Button";
import { FaPlus, FaWrench } from "react-icons/fa";
import TextEditor from "components/common/TextEditor";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
  useUpdateArtistMutation,
} from "queries";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const [addingNewTier, setAddingNewTier] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });

  const { artistId } = useParams();
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const { data: artist, refetch: refetchArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: tiers, refetch: refetchTiers } = useQuery(
    queryManagedArtistSubscriptionTiers({
      artistId: Number(artistId),
    })
  );

  const userId = user?.id;

  const { mutate: updateArtist, isPending: isUpdatingMessages } =
    useUpdateArtistMutation();

  const originalSupportMessage = React.useMemo(() => {
    const emails = (
      (artist?.properties as { emails?: { support?: string | null } })?.emails ??
      {}
    ) as { support?: string | null };
    return typeof emails.support === "string" ? emails.support : "";
  }, [artist]);

  const originalPurchaseMessage = React.useMemo(() => {
    const emails = (
      (artist?.properties as { emails?: { purchase?: string | null } })?.emails ??
      {}
    ) as { purchase?: string | null };
    return typeof emails.purchase === "string" ? emails.purchase : "";
  }, [artist]);

  const [supportMessage, setSupportMessage] = React.useState<string>("");
  const [purchaseMessage, setPurchaseMessage] = React.useState<string>("");

  React.useEffect(() => {
    setSupportMessage(originalSupportMessage ?? "");
    setPurchaseMessage(originalPurchaseMessage ?? "");
  }, [originalSupportMessage, originalPurchaseMessage]);

  const isEditorContentEmpty = React.useCallback((value: string) => {
    if (!value) return true;
    const textContent = value
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, "")
      .trim();
    return textContent.length === 0;
  }, []);

  const normalizeEditorValue = React.useCallback(
    (value: string) => (isEditorContentEmpty(value) ? "" : value),
    [isEditorContentEmpty]
  );

  const normalizedSupportMessage = normalizeEditorValue(supportMessage);
  const normalizedPurchaseMessage = normalizeEditorValue(purchaseMessage);
  const normalizedOriginalSupportMessage = normalizeEditorValue(
    originalSupportMessage ?? ""
  );
  const normalizedOriginalPurchaseMessage = normalizeEditorValue(
    originalPurchaseMessage ?? ""
  );

  const hasMessageChanges =
    normalizedSupportMessage !== normalizedOriginalSupportMessage ||
    normalizedPurchaseMessage !== normalizedOriginalPurchaseMessage;

  const handleSaveMessages = React.useCallback(() => {
    if (!artist || !userId) {
      return;
    }

    const supportValue = isEditorContentEmpty(supportMessage)
      ? undefined
      : supportMessage;
    const purchaseValue = isEditorContentEmpty(purchaseMessage)
      ? undefined
      : purchaseMessage;

    const existingEmails = artist.properties?.emails ?? {};
    const updatedEmails: Record<string, string> = {};

    Object.entries(existingEmails).forEach(([key, value]) => {
      if (typeof value === "string") {
        updatedEmails[key] = value;
      }
    });

    if (typeof supportValue === "string") {
      updatedEmails.support = supportValue;
    } else {
      delete updatedEmails.support;
    }

    if (typeof purchaseValue === "string") {
      updatedEmails.purchase = purchaseValue;
    } else {
      delete updatedEmails.purchase;
    }

    const updatedProperties: NonNullable<Artist["properties"]> =
      artist.properties
        ? { ...artist.properties }
        : ({} as NonNullable<Artist["properties"]>);

    if (Object.keys(updatedEmails).length > 0) {
      updatedProperties.emails = updatedEmails;
    } else {
      delete updatedProperties.emails;
    }

    updateArtist(
      {
        userId,
        artistId: artist.id,
        body: {
          properties: updatedProperties,
        },
      },
      {
        onSuccess: () => {
          snackbar(t("messagesUpdated"), { type: "success" });
          refetchArtist();
        },
        onError: () => {
          snackbar(t("messagesUpdateError"), { type: "warning" });
        },
      }
    );
  }, [
    artist,
    purchaseMessage,
    refetchArtist,
    snackbar,
    supportMessage,
    t,
    updateArtist,
    userId,
    isEditorContentEmpty,
  ]);

  if (!artist) {
    return null;
  }

  return (
    <>
      <ManageSectionWrapper>
        <h3>{t("thankYouMessages")}</h3>
        <p
          className={css`
            margin-bottom: 1.5rem;
            max-width: 60ch;
          `}
        >
          {t("thankYouMessagesDescription")}
        </p>
        <div
          className={css`
            margin-bottom: 1.5rem;
          `}
        >
          <h4
            className={css`
              margin-bottom: 0.5rem;
            `}
          >
            {t("supportEmailLabel")}
          </h4>
          <TextEditor
            value={supportMessage}
            onChange={(value: string) => setSupportMessage(value)}
          />
        </div>
        <div
          className={css`
            margin-bottom: 1.5rem;
          `}
        >
          <h4
            className={css`
              margin-bottom: 0.5rem;
            `}
          >
            {t("purchaseEmailLabel")}
          </h4>
          <TextEditor
            value={purchaseMessage}
            onChange={(value: string) => setPurchaseMessage(value)}
          />
          </div>
        <Button
          onClick={handleSaveMessages}
          disabled={!hasMessageChanges || isUpdatingMessages || !userId}
        >
          {t("saveMessages")}
        </Button>
      </ManageSectionWrapper>
      <ManageSectionWrapper>
        <SpaceBetweenDiv>
          <div />
          <div
            className={css`
              display: flex;
            `}
          >
            <ButtonLink
              to="supporters"
              className={css`
                margin-right: 0.25rem;
              `}
              variant="dashed"
              size="compact"
              collapsible
              startIcon={<FaWrench />}
            >
              {t("supporters")}
            </ButtonLink>
            <Button
              onClick={() => {
                setAddingNewTier(true);
              }}
              startIcon={<FaPlus />}
              size="compact"
              variant="dashed"
            >
              {t("addNewTier")}
            </Button>
          </div>
        </SpaceBetweenDiv>
        <div
          className={css`
            margin-bottom: 1rem;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          `}
        >
          {tiers?.results.map((tier) => (
            <ManageSubscriptionTierBox
              tier={tier}
              key={tier.id}
              reload={refetchTiers}
              artist={artist}
            />
          ))}
        </div>
        <Modal
          open={addingNewTier}
          onClose={() => setAddingNewTier(false)}
          title={t("newSubscriptionTierFor", { artistName: artist.name }) ?? ""}
        >
          <SubscriptionForm artist={artist} reload={refetchTiers} />
        </Modal>
      </ManageSectionWrapper>
    </>
  );
};

export default ManageArtistSubscriptionTiers;
