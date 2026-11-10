import type { FundraiserUpdate } from "queries/fundraisers";

export type FundraiserFormData = {
  fundraiserName?: string;
  fundraiserDescription?: string;
  goalAmount?: string;
  fundraiserMinPledge?: string;
  isAllOrNothing?: boolean;
  fundraiserEndDate?: string;
  fundraiserVideoUrl?: string;
};

const centsToInput = (cents?: number) => (cents ? `${cents / 100}` : "");

const inputToCents = (value?: string) => {
  const num = Number(value);
  return value === undefined || value === "" || isNaN(num)
    ? 0
    : Math.round(num * 100);
};

const pad = (n: number) => String(n).padStart(2, "0");

const isoToDateInput = (iso?: string | null) => {
  const date = iso ? new Date(iso) : undefined;
  if (!date || isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const dateInputToIso = (value?: string) => {
  const date = value ? new Date(`${value}T23:59:59`) : undefined;
  return date && !isNaN(date.getTime()) ? date.toISOString() : null;
};

export const fundraiserToFormData = (
  fundraiser?: Partial<
    Pick<
      Fundraiser,
      | "name"
      | "description"
      | "goalAmount"
      | "minPledge"
      | "isAllOrNothing"
      | "endDate"
      | "videoUrl"
    >
  > | null
): FundraiserFormData => ({
  fundraiserName: fundraiser?.name ?? "",
  fundraiserDescription: fundraiser?.description ?? "",
  goalAmount: centsToInput(fundraiser?.goalAmount),
  fundraiserMinPledge: centsToInput(fundraiser?.minPledge),
  isAllOrNothing: fundraiser?.isAllOrNothing ?? false,
  fundraiserEndDate: isoToDateInput(fundraiser?.endDate),
  fundraiserVideoUrl:
    fundraiser?.videoUrl === undefined
      ? undefined
      : (fundraiser.videoUrl ?? ""),
});

export const formDataToFundraiserUpdate = (
  formData: FundraiserFormData
): FundraiserUpdate => ({
  name: formData.fundraiserName,
  description: formData.fundraiserDescription,
  goalAmount: inputToCents(formData.goalAmount),
  minPledge: inputToCents(formData.fundraiserMinPledge),
  endDate: dateInputToIso(formData.fundraiserEndDate),
  videoUrl: formData.fundraiserVideoUrl,
  // Undefined when the checkbox is disabled (pledges exist); leave it as is
  isAllOrNothing:
    formData.isAllOrNothing === undefined
      ? undefined
      : !!formData.isAllOrNothing,
});
