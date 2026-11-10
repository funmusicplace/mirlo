import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import {
  QUERY_KEY_FUNDRAISERS,
  QUERY_KEY_SALES,
  QUERY_KEY_TRACK_GROUPS,
  queryKeyIncludes,
} from "./queryKeys";

const fetchManagedArtistFundraisers: QueryFunction<
  { results: FundraiserSummary[] },
  ["fetchManagedArtistFundraisers", { artistId: number }, ...any]
> = ({ queryKey: [_, { artistId }], signal }) =>
  api.get(`v1/manage/artists/${artistId}/fundraisers`, { signal });

export function queryManagedArtistFundraisers(artistId: number) {
  return queryOptions({
    queryKey: [
      "fetchManagedArtistFundraisers",
      { artistId },
      QUERY_KEY_FUNDRAISERS,
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchManagedArtistFundraisers,
    enabled: !!artistId,
  });
}

const fetchManagedFundraiser: QueryFunction<
  ManagedFundraiser,
  ["fetchManagedFundraiser", { fundraiserId: number }, ...any]
> = ({ queryKey: [_, { fundraiserId }], signal }) =>
  api
    .get<{
      result: ManagedFundraiser;
    }>(`v1/manage/fundraisers/${fundraiserId}`, { signal })
    .then((r) => r.result);

export function queryManagedFundraiser(fundraiserId: number) {
  return queryOptions({
    queryKey: [
      "fetchManagedFundraiser",
      { fundraiserId },
      QUERY_KEY_FUNDRAISERS,
      QUERY_KEY_TRACK_GROUPS,
    ],
    queryFn: fetchManagedFundraiser,
    enabled: isFinite(fundraiserId),
  });
}

export function useInvalidateFundraisers() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({
      predicate: (query) =>
        queryKeyIncludes(query, QUERY_KEY_FUNDRAISERS) ||
        queryKeyIncludes(query, QUERY_KEY_TRACK_GROUPS) ||
        queryKeyIncludes(query, QUERY_KEY_SALES),
    });
}

export function useCreateFundraiserMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: ({
      artistId,
      ...body
    }: {
      artistId: number;
      name?: string;
      trackGroupId?: number;
    }) =>
      api.post<typeof body, { result: Fundraiser }>(
        `v1/manage/artists/${artistId}/fundraisers`,
        body
      ),
    onSuccess: invalidate,
  });
}

export type FundraiserUpdate = Partial<
  Pick<
    Fundraiser,
    "name" | "description" | "goalAmount" | "minPledge" | "isAllOrNothing"
  > & { endDate: string | null }
>;

export function useUpdateFundraiserMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: (opts: { fundraiserId: number; body: FundraiserUpdate }) =>
      api.put<FundraiserUpdate, { result: Fundraiser }>(
        `v1/manage/fundraisers/${opts.fundraiserId}`,
        opts.body
      ),
    onSuccess: invalidate,
  });
}

export function useChargeFundraiserPledgesMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: (fundraiserId: number) =>
      api.post<object, unknown>(
        `v1/manage/fundraisers/${fundraiserId}/chargePledges`,
        {}
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteFundraiserMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: (fundraiserId: number) =>
      api.del(`v1/manage/fundraisers/${fundraiserId}`),
    onSuccess: invalidate,
  });
}

export function useDeleteFundraiserImageMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: (opts: { fundraiserId: number; fundraiserImageId: string }) =>
      api.del(
        `v1/manage/fundraisers/${opts.fundraiserId}/images/${opts.fundraiserImageId}`
      ),
    onSuccess: invalidate,
  });
}

export function useReorderFundraiserImagesMutation() {
  const invalidate = useInvalidateFundraisers();
  return useMutation({
    mutationFn: (opts: {
      fundraiserId: number;
      fundraiserImageIds: string[];
    }) =>
      api.put<{ fundraiserImageIds: string[] }, unknown>(
        `v1/manage/fundraisers/${opts.fundraiserId}/images`,
        { fundraiserImageIds: opts.fundraiserImageIds }
      ),
    onSuccess: invalidate,
  });
}
