import { FormSettings } from "components/Admin/settings/settingsForm";
import { Path } from "react-hook-form";

export const GUIDE_STEPS = [
  { key: "welcome", labelKey: "steps.welcome" },
  { key: "systemCheck", labelKey: "steps.systemCheck" },
  { key: "identity", labelKey: "steps.identity" },
  { key: "email", labelKey: "steps.email" },
  { key: "payments", labelKey: "steps.payments" },
  { key: "spamProtection", labelKey: "steps.spamProtection" },
  { key: "platformPolicy", labelKey: "steps.platformPolicy" },
  { key: "done", labelKey: "steps.done" },
] as const;

export type GuideStepKey = (typeof GUIDE_STEPS)[number]["key"];

export const SUMMARY_STEPS = GUIDE_STEPS.slice(1, -1);

export const SAVED_STEP_KEYS = [
  "identity",
  "email",
  "payments",
  "spamProtection",
  "platformPolicy",
] as const;

export type SavedStepKey = (typeof SAVED_STEP_KEYS)[number];

export const STEP_FIELDS: Record<SavedStepKey, Path<FormSettings>[]> = {
  identity: ["instanceCustomization.title", "instanceCustomization.colors"],
  email: [
    "emailProvider",
    "instanceCustomization.contactEmail",
    "instanceCustomization.supportEmail",
  ],
  payments: [
    "stripe.key",
    "stripe.publishableKey",
    "stripe.webhookConnectSigningSecret",
  ],
  spamProtection: ["cloudflareTurnstileSecret", "defconLevel"],
  platformPolicy: [
    "platformPercent",
    "isClosedToPublicArtistSignup",
    "terms",
    "privacyPolicy",
    "cookiePolicy",
    "contentPolicy",
  ],
};

export const isSavedStep = (key: GuideStepKey): key is SavedStepKey =>
  (SAVED_STEP_KEYS as readonly string[]).includes(key);
