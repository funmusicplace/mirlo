import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { InputEl } from "components/common/Input";
import { getCurrencySymbol } from "components/common/Money";
import {
  queryManagedArtistMerch,
  queryManagedArtistTrackGroups,
} from "queries";
import { QUERY_KEY_MERCH, QUERY_KEY_TRACK_GROUPS } from "queries/queryKeys";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getManageReleaseUrl } from "utils/artist";

import { ManageSectionWrapper } from "./ManageSectionWrapper";

const centsToDollarString = (cents?: number | null) => {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toString();
};

const parseDollarsToCents = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};

const PriceRow: React.FC<{
  itemId: number | string;
  title?: string | null;
  imageSrc?: string;
  subtitle?: React.ReactNode;
  initialMinPriceCents: number | null;
  currency: string;
  onSave: (nextCents: number) => Promise<void>;
}> = ({
  itemId,
  title,
  imageSrc,
  subtitle,
  initialMinPriceCents,
  currency,
  onSave,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const [value, setValue] = React.useState(
    centsToDollarString(initialMinPriceCents)
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If the server-supplied value changes (e.g. after refetch), sync the input
  // unless the user is actively editing.
  const initialString = React.useMemo(
    () => centsToDollarString(initialMinPriceCents),
    [initialMinPriceCents]
  );
  const lastSyncedRef = React.useRef(initialString);
  React.useEffect(() => {
    if (lastSyncedRef.current !== initialString) {
      setValue(initialString);
      lastSyncedRef.current = initialString;
    }
  }, [initialString]);

  const inputId = `bulk-price-${itemId}`;
  const currencyHintId = `${inputId}-currency`;
  const errorId = `${inputId}-error`;
  const isDirty = value.trim() !== initialString.trim();

  const commit = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const cents = parseDollarsToCents(value);
      if (cents === null) {
        setError(t("priceMustBeZeroOrMore") ?? "Price must be zero or more");
        return;
      }
      if (cents === (initialMinPriceCents ?? 0)) return;

      setError(null);
      setIsSaving(true);
      try {
        await onSave(cents);
      } catch (err) {
        setError(t("priceSaveFailed") ?? "Couldn't save price, try again");
      } finally {
        setIsSaving(false);
      }
    },
    [value, initialMinPriceCents, onSave, t]
  );

  return (
    <li className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 px-3 border-b border-(--mi-darken-x-background-color) list-none">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ImageWithPlaceholder src={imageSrc} alt="" size={60} square />
        <div className="min-w-0">
          <label htmlFor={inputId} className="font-semibold block truncate">
            {title || t("untitled")}
          </label>
          {subtitle && (
            <p className="text-xs text-(--mi-light-foreground-color) truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <form className="flex items-center gap-2 flex-wrap" onSubmit={commit}>
        <span
          id={currencyHintId}
          className="text-(--mi-light-foreground-color)"
        >
          {getCurrencySymbol(currency)}
        </span>
        <InputEl
          id={inputId}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-[7rem]!"
          disabled={isSaving}
          aria-describedby={
            error ? `${currencyHintId} ${errorId}` : currencyHintId
          }
          aria-invalid={!!error}
        />
        <ArtistButton
          type="submit"
          variant="outlined"
          size="compact"
          isLoading={isSaving}
          disabled={isSaving || !isDirty}
        >
          {t("save")}
        </ArtistButton>
        {error && (
          <span
            id={errorId}
            className="text-xs text-(--mi-red-700)"
            role="alert"
          >
            {error}
          </span>
        )}
      </form>
    </li>
  );
};

const ManageArtistPricing: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const { data: trackGroupsData, isLoading: isLoadingReleases } = useQuery(
    queryManagedArtistTrackGroups({ artistId: Number(artistId) })
  );

  const { data: merchData, isLoading: isLoadingMerch } = useQuery(
    queryManagedArtistMerch({ artistId: Number(artistId) })
  );

  const releases = trackGroupsData?.results ?? [];
  const merch = merchData?.results ?? [];

  const handleSaveTrackGroup = React.useCallback(
    async (trackGroupId: number, nextCents: number) => {
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        minPrice: nextCents,
      });
      snackbar(t("priceSaved"), { type: "success" });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_TRACK_GROUPS] });
    },
    [queryClient, snackbar, t]
  );

  const handleSaveMerch = React.useCallback(
    async (merchId: string, nextCents: number) => {
      await api.put(`manage/merch/${merchId}`, { minPrice: nextCents });
      snackbar(t("priceSaved"), { type: "success" });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_MERCH] });
    },
    [queryClient, snackbar, t]
  );

  return (
    <ManageSectionWrapper>
      <h1 className="text-xl font-semibold">{t("bulkPricing")}</h1>
      <p className="text-sm text-(--mi-light-foreground-color) max-w-prose mb-2">
        {t("bulkPricingDescription")}
      </p>

      <section className="flex flex-col gap-2 mt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t("releases")}</h2>
          {!!releases.length && (
            <small>{t("totalCount", { count: releases.length })}</small>
          )}
        </div>
        {isLoadingReleases ? (
          <LoadingBlocks />
        ) : releases.length === 0 ? (
          <p className="text-sm text-(--mi-light-foreground-color)">
            {t("noReleasesYet")}
          </p>
        ) : (
          <ul className="border border-(--mi-darken-x-background-color) rounded list-none p-0 m-0">
            {releases.map((release) => {
              const receivesPayment =
                (release.paymentToUserId ?? release.artist?.userId) ===
                user?.id;
              const recipientName =
                !receivesPayment && release.paymentToUser?.name
                  ? release.paymentToUser.name
                  : null;
              const subtitleText = receivesPayment
                ? t("youReceivePayments")
                : recipientName
                  ? t("namedReceivesPayments", { name: recipientName })
                  : t("anotherAccountReceivesPayments");
              const subtitle = release.artist ? (
                <Link
                  to={getManageReleaseUrl(release.artist, release)}
                  className="underline"
                >
                  {subtitleText}
                </Link>
              ) : (
                subtitleText
              );

              return (
                <PriceRow
                  key={release.id}
                  itemId={release.id}
                  title={release.title}
                  imageSrc={release.cover?.sizes?.[60]}
                  subtitle={subtitle}
                  initialMinPriceCents={release.minPrice ?? null}
                  currency={release.currency ?? "usd"}
                  onSave={(cents) => handleSaveTrackGroup(release.id, cents)}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 mt-8">
        <h2 className="text-lg font-semibold">{t("merch")}</h2>
        {isLoadingMerch ? (
          <LoadingBlocks />
        ) : merch.length === 0 ? (
          <p className="text-sm text-(--mi-light-foreground-color)">
            {t("noMerchYet")}
          </p>
        ) : (
          <ul className="border border-(--mi-darken-x-background-color) rounded list-none p-0 m-0">
            {merch.map((item) => (
              <PriceRow
                key={item.id}
                itemId={item.id}
                title={item.title}
                imageSrc={item.images?.[0]?.sizes?.[60]}
                subtitle={
                  item.includePurchaseTrackGroupId
                    ? t("includesDigitalDownload")
                    : undefined
                }
                initialMinPriceCents={item.minPrice ?? null}
                currency={item.currency ?? "usd"}
                onSave={(cents) => handleSaveMerch(item.id, cents)}
              />
            ))}
          </ul>
        )}
      </section>
    </ManageSectionWrapper>
  );
};

export default ManageArtistPricing;
