import { ArtistButton } from "components/Artist/ArtistButtons";
import FundraiserProgressCircle from "components/common/FundraiserProgressCircle";
import { moneyDisplay } from "components/common/Money";
import { useUpdateFundraiserMutation } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import FundraiserActions from "./FundraiserActions";
import {
  FundraiserFormData,
  formDataToFundraiserUpdate,
  fundraiserToFormData,
} from "./fundraiserFormData";
import FundraiserFormFields from "./FundraiserFormFields";
import FundraiserImagesEditor from "./FundraiserImagesEditor";
import FundraiserVideoField from "./FundraiserVideoField";

const FundraiserForm: React.FC<{
  artistId: number;
  fundraiser: ManagedFundraiser;
  currency?: string;
  onRemoved: () => void;
}> = ({ artistId, fundraiser, currency, onRemoved }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { mutateAsync: updateFundraiser, isPending } =
    useUpdateFundraiserMutation();

  const methods = useForm<FundraiserFormData>({
    defaultValues: fundraiserToFormData(fundraiser),
  });

  const onSubmit = async (data: FundraiserFormData) => {
    try {
      await updateFundraiser({
        fundraiserId: fundraiser.id,
        body: formDataToFundraiserUpdate(data),
      });
      methods.reset(data);
      snackbar(t("saved"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <FundraiserProgressCircle
            amountRaised={fundraiser.amountRaised}
            goalAmount={fundraiser.goalAmount}
            size="large"
          />
          <p>
            {t("raisedOutOfGoal", {
              raised: moneyDisplay({
                amount: fundraiser.amountRaised / 100,
                currency,
              }),
              goal: moneyDisplay({
                amount: fundraiser.goalAmount / 100,
                currency,
              }),
            })}
            {fundraiser.status === "SUCCESSFUL" && (
              <span className="ml-2 font-semibold text-(--mi-success-text-color)">
                {t("funded")}
              </span>
            )}
          </p>
        </div>
        <FundraiserActions
          fundraiser={fundraiser}
          amountRaised={fundraiser.amountRaised}
          pledgeCount={fundraiser.pledgeCount}
          onRemoved={onRemoved}
        />
      </div>
      {fundraiser.trackGroups.length > 0 && (
        <div>
          <h2 className="text-base! mb-1!">{t("linkedReleases")}</h2>
          <ul className="list-disc pl-6">
            {fundraiser.trackGroups.map((trackGroup) => (
              <li key={trackGroup.id}>
                <Link
                  to={`/manage/artists/${artistId}/release/${trackGroup.id}`}
                >
                  {trackGroup.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FundraiserImagesEditor fundraiser={fundraiser} />
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="flex flex-col gap-2"
        >
          <FundraiserFormFields
            artistId={artistId}
            currency={currency}
            isAllOrNothing={fundraiser.isAllOrNothing}
            hasPledges={fundraiser.pledgeCount > 0}
          />
          <FundraiserVideoField videoEmbedUrl={fundraiser.videoEmbedUrl} />
          <div>
            <ArtistButton
              type="submit"
              isLoading={isPending}
              disabled={isPending || !methods.formState.isDirty}
            >
              {t("save")}
            </ArtistButton>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default FundraiserForm;
