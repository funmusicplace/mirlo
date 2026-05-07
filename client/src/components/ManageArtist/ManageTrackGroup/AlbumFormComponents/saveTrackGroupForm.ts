import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY_TRACK_GROUPS } from "queries/queryKeys";
import React from "react";
import { useFormContext } from "react-hook-form";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

import { TrackGroupFormData } from "../ManageTrackGroup";

interface SaveTrackGroupFormContext {
  trackGroupId: number;
  artistId: number;
  fundraiserId?: number;
}

const toIsoOrNull = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toCentsOrNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
};

export async function saveTrackGroupForm(
  values: TrackGroupFormData,
  ctx: SaveTrackGroupFormContext
) {
  const trackGroupPayload = {
    title: values.title,
    about: values.about,
    credits: values.credits,
    releaseDate: toIsoOrNull(values.releaseDate),
    publishedAt: toIsoOrNull(values.publishedAt),
    minPrice: toCentsOrNull(values.minPrice),
    suggestedPrice: toCentsOrNull(values.suggestedPrice),
    catalogNumber: values.catalogNumber,
    urlSlug: values.urlSlug,
    isPublic: values.isPublic,
    isGettable: values.isGettable,
    platformPercent:
      values.platformPercent !== undefined && values.platformPercent !== ""
        ? Number(values.platformPercent)
        : undefined,
    artistId: ctx.artistId,
  };

  const requests: Promise<unknown>[] = [
    api.put(`manage/trackGroups/${ctx.trackGroupId}`, trackGroupPayload),
  ];

  if (ctx.fundraiserId) {
    const fundraiserPayload = {
      goalAmount: toCentsOrNull(values.goalAmount) ?? 0,
      isAllOrNothing: !!values.isAllOrNothing,
    };
    requests.push(
      api.put(`manage/fundraisers/${ctx.fundraiserId}`, fundraiserPayload)
    );
  }

  await Promise.all(requests);
}

export function useSaveTrackGroupForm(
  trackGroup: TrackGroup,
  artistId: number,
  reload: () => Promise<unknown>
) {
  const methods = useFormContext<TrackGroupFormData>();
  const errorHandler = useErrorHandler();
  const client = useQueryClient();

  return React.useCallback(async () => {
    if (!methods) return;
    const values = methods.getValues();
    try {
      await saveTrackGroupForm(values, {
        trackGroupId: trackGroup.id,
        artistId,
        fundraiserId: trackGroup.fundraiser?.id,
      });
      methods.reset(values);
      await reload();
      client.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (obj) =>
              typeof obj === "string" &&
              obj.toLowerCase().includes(QUERY_KEY_TRACK_GROUPS.toLowerCase())
          ),
      });
    } catch (e) {
      errorHandler(e);
      throw e;
    }
  }, [
    trackGroup.id,
    trackGroup.fundraiser?.id,
    artistId,
    methods,
    reload,
    client,
    errorHandler,
  ]);
}
