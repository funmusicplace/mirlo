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
import { pickBy, isString } from "lodash";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTiers,
  useUpdateArtistMutation,
} from "queries";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

type ArtistEmailKey = keyof NonNullable<NonNullable<Artist["properties"]>["emails"]>;

const getEmailMessageFromProperties = (
  properties: Artist["properties"] | undefined,
  key: ArtistEmailKey
): string => {
  const emails = properties?.emails;
  const value = emails?.[key];
  return typeof value === "string" ? value : "";
};

const isEditorContentEmpty = (value: string) => {
  if (!value) return true;
  const textContent = value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, "")
    .trim();
  return textContent.length === 0;
};

const normalizeEditorValue = (value: string) =>
  isEditorContentEmpty(value) ? "" : value;

const mergeArtistPropertiesWithEmailUpdates = (
  properties: Artist["properties"] | undefined,
  updates: Partial<Record<ArtistEmailKey, string | undefined>>
) => {
  const nextProperties: NonNullable<Artist["properties"]> = properties
    ? { ...properties }
    : ({} as NonNullable<Artist["properties"]>);

  const existingEmails = pickBy(properties?.emails ?? {}, isString) as Partial<
    Record<ArtistEmailKey, string>
  >;

  const sanitizedUpdates = pickBy(
    updates,
    (value): value is string => typeof value === "string" && !isEditorContentEmpty(value)
  ) as Partial<Record<ArtistEmailKey, string>>;

  const nextEmails: Partial<Record<ArtistEmailKey, string>> = {
    ...existingEmails,
    ...sanitizedUpdates,
  };

  (Object.keys(updates) as ArtistEmailKey[]).forEach((key) => {
    if (!(key in sanitizedUpdates)) {
      delete nextEmails[key];
    }
  });

  if (Object.keys(nextEmails).length > 0) {
    nextProperties.emails = nextEmails;
  } else {
    delete nextProperties.emails;
  }

  return nextProperties;
};

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

  const originalSupportMessage = React.useMemo(
    () => getEmailMessageFromProperties(artist?.properties, "support"),
    [artist]
  );

  const originalPurchaseMessage = React.useMemo(
    () => getEmailMessageFromProperties(artist?.properties, "purchase"),
    [artist]
  );

  const [supportMessage, setSupportMessage] = React.useState<string>("");
  const [purchaseMessage, setPurchaseMessage] = React.useState<string>("");

  React.useEffect(() => {
    setSupportMessage(originalSupportMessage ?? "");
    setPurchaseMessage(originalPurchaseMessage ?? "");
  }, [originalSupportMessage, originalPurchaseMessage]);

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

    const updatedProperties = mergeArtistPropertiesWithEmailUpdates(
      artist.properties,
      {
        support: supportValue,
        purchase: purchaseValue,
      }
    );

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
    mergeArtistPropertiesWithEmailUpdates,
  ]);

  if (!artist) {
    return null;
  }

  return (
    <>
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
            display: grid;
            gap: 1.5rem;
            margin-bottom: 1.5rem;

            @media (min-width: 960px) {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          `}
        >
          <div
            className={css`
              display: flex;
              flex-direction: column;
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
              className={css`
                margin-top: 0.5rem;
              `}
              disableFloatingToolbar
            />
          </div>
          <div
            className={css`
              display: flex;
              flex-direction: column;
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
              className={css`
                margin-top: 0.5rem;
              `}
              disableFloatingToolbar
            />
          </div>
        </div>
      <Button
          onClick={handleSaveMessages}
          disabled={!hasMessageChanges || isUpdatingMessages || !userId}
        >
          {t("saveMessages")}
        </Button>
      </ManageSectionWrapper>
    </>
  );
};

export default ManageArtistSubscriptionTiers;
