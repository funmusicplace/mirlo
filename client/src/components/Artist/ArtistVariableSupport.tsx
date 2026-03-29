import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { isEmpty } from "lodash";
import { queryArtist } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import useErrorHandler from "services/useErrorHandler";
import { getCurrencySymbol } from "components/common/Money";
import { ArtistButton, useGetArtistColors } from "./ArtistButtons";
import ArtistTrackGroup from "./ArtistTrackGroup";
import useArtistQuery from "utils/useArtistQuery";

const ArtistVariableSupport: React.FC<{
  tier: ArtistSubscriptionTier;
}> = ({ tier }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { handleSubmit, register, formState, getValues } = useForm({
    defaultValues: {
      amount: tier.minAmount ? tier.minAmount / 100 : 0,
    },
  });
  const { colors } = useGetArtistColors();
  const { refreshLoggedInUser } = useAuthContext();
  const [open, setOpen] = React.useState(false);
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const { artistId } = useParams();
  const { refetch: refresh } = useQuery(queryArtist({ artistSlug: artistId }));
  const errorHandler = useErrorHandler();

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    try {
      setIsCheckingForSubscription(true);
      const response = await api.post<
        { tierId: number; amount?: number },
        { sessionUrl: string }
      >(`artists/${tier.artistId}/subscribe`, {
        tierId: tier.id,
        amount: tier.allowVariable ? getValues("amount") * 100 : tier.minAmount,
      });
      window.location.assign(response.sessionUrl);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsCheckingForSubscription(false);
      refresh();
      refreshLoggedInUser();
    }
  };

  return (
    <>
      <ArtistButton
        size="big"
        rounded
        uppercase
        onClick={() =>
          tier.allowVariable ? setOpen(true) : subscribeToTier(tier)
        }
        isLoading={isCheckingForSubscription}
        disabled={isCheckingForSubscription}
        className={css`
          width: 100%;
        `}
      >
        {t("support")}
      </ArtistButton>
      <Modal
        size="small"
        open={open}
        onClose={() => setOpen(false)}
        title={t("howMuch") ?? ""}
      >
        <form
          onSubmit={handleSubmit(() => subscribeToTier(tier))}
          className="flex flex-col gap-3"
        >
          <p>{tier.description}</p>
          <strong>{t("chooseAnAmount")}</strong>
          <div className="flex items-center gap-2 ">
            <span className="whitespace-nowrap">
              {getCurrencySymbol(tier.currency)}
            </span>
            <InputEl
              {...register("amount", {
                min: tier.minAmount ? tier.minAmount / 100 : undefined,
                required: true,
              })}
            />
            <span className="whitespace-nowrap">
              {t(tier.interval === "MONTH" ? "monthly" : "yearly")}
            </span>
            {!!tier.minAmount && formState.errors?.amount && (
              <small>
                {t("mustBeAtLeast", { minAmount: tier.minAmount / 100 })}
              </small>
            )}
          </div>

          <div className="w-full">{t("includesNewReleasesLong")}</div>

          {tier.releases && tier.releases.length > 0 && (
            <div className="flex gap-2 flex-col ">
              <strong>{t("includesTheseReleases")}</strong>
              <div className="grid gap-2 grid-cols-4">
                {tier.releases.map((release) => (
                  <div key={release.trackGroupId} className="flex flex-col">
                    {release.trackGroup.cover && (
                      <img
                        src={
                          release.trackGroup.cover.sizes?.[120] ??
                          release.trackGroup.cover.url?.[0]
                        }
                        alt={release.trackGroup.title}
                        className="w-8 h-8 object-cover flex-shrink-0"
                      />
                    )}
                    {!release.trackGroup.cover && (
                      <div
                        className="w-10 h-10 flex-shrink-0"
                        style={{ backgroundColor: colors?.secondary }}
                      />
                    )}
                    <span className="flex-1 truncate text-sm">
                      {release.trackGroup.artist.name}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {release.trackGroup.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ArtistButton
            isLoading={isCheckingForSubscription}
            disabled={isCheckingForSubscription || !isEmpty(formState.errors)}
            size="big"
            uppercase
            rounded
            type="submit"
            className="w-full mt-2"
          >
            {t("letsSupport")}
          </ArtistButton>
          <div
            className={css`
              margin-top: 1rem;

              small {
                display: block;
                margin-bottom: 0.5rem;
              }
            `}
          >
            <small>{t("artistCheckoutPage")}</small>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ArtistVariableSupport;
