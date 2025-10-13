import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { pickBy, isString } from "lodash";
import TextEditor from "components/common/TextEditor";
import Button from "components/common/Button";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { useUpdateArtistMutation } from "queries";

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

interface ThankYouMessageEditorsProps {
  artist: Artist;
  onArtistUpdated?: () => void;
}

const ThankYouMessageEditors: React.FC<ThankYouMessageEditorsProps> = ({
  artist,
  onArtistUpdated,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "subscriptionForm" });
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
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

  const [supportMessage, setSupportMessage] = React.useState<string>(
    originalSupportMessage
  );
  const [purchaseMessage, setPurchaseMessage] = React.useState<string>(
    originalPurchaseMessage
  );

  React.useEffect(() => {
    setSupportMessage(originalSupportMessage);
    setPurchaseMessage(originalPurchaseMessage);
  }, [originalSupportMessage, originalPurchaseMessage]);

  const normalizedSupportMessage = normalizeEditorValue(supportMessage);
  const normalizedPurchaseMessage = normalizeEditorValue(purchaseMessage);
  const normalizedOriginalSupportMessage = normalizeEditorValue(
    originalSupportMessage
  );
  const normalizedOriginalPurchaseMessage = normalizeEditorValue(
    originalPurchaseMessage
  );

  const hasMessageChanges =
    normalizedSupportMessage !== normalizedOriginalSupportMessage ||
    normalizedPurchaseMessage !== normalizedOriginalPurchaseMessage;

  const handleSaveMessages = React.useCallback(() => {
    if (!userId) {
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
          onArtistUpdated?.();
        },
        onError: () => {
          snackbar(t("messagesUpdateError"), { type: "warning" });
        },
      }
    );
  }, [
    artist,
    purchaseMessage,
    supportMessage,
    t,
    updateArtist,
    userId,
    snackbar,
    onArtistUpdated,
  ]);

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        width: 100%;
      `}
    >
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
    </div>
  );
};

export default ThankYouMessageEditors;
