import { pickBy, isString } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";

type ArtistEmailKey = keyof NonNullable<
  NonNullable<Artist["properties"]>["emails"]
>;

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
    (value): value is string =>
      typeof value === "string" && !isEditorContentEmpty(value)
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
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const snackbar = useSnackbar();
  const { user } = useAuthContext();

  return (
    <div className="flex w-full flex-col">
      <h2 className="font-bold!">{t("thankYouMessages")}</h2>
      <p className="mb-6 max-w-[60ch]">{t("thankYouMessagesDescription")}</p>
      <div className="mb-6 grid gap-6 min-[960px]:grid-cols-2">
        <div className="flex flex-col">
          <h3 className="mb-2! pb-0! text-lg!">{t("supportEmailLabel")}</h3>
          <SavingInput
            formKey="properties.emails.support"
            textEditor
            textEditorProps={{
              disableFloatingToolbar: true,
              basicStyles: true,
            }}
            url={`manage/artists/${artist.id}`}
          />
        </div>
        <div className="flex flex-col">
          <h3 className="mb-2! pb-0! text-lg!">{t("purchaseEmailLabel")}</h3>
          <SavingInput
            formKey="properties.emails.purchase"
            textEditor
            textEditorProps={{
              disableFloatingToolbar: true,
              basicStyles: true,
            }}
            url={`manage/artists/${artist.id}`}
          />
        </div>
      </div>
    </div>
  );
};

export default ThankYouMessageEditors;
