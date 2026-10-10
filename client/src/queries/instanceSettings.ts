import {
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { querySetupStatus } from "queries/admin";
import { getInjectedInstanceSettings } from "utils/injectedData";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";

import * as api from "./fetch/fetchWrapper";

const fetchInstanceSettings = ({ signal }: { signal?: AbortSignal }) =>
  api
    .get<{ result: InstanceSettings }>("v1/instance", { signal })
    .then((r) => r.result);

export function queryInstanceSettings() {
  return queryOptions({
    queryKey: ["fetchInstanceSettings"],
    queryFn: fetchInstanceSettings,
    staleTime: Infinity,
    initialData: getInjectedInstanceSettings,
  });
}

export const useInstanceSettings = (): InstanceSettings =>
  useQuery(queryInstanceSettings()).data ?? DEFAULT_INSTANCE_SETTINGS;

export const useStripePublishableKey = (): string | undefined =>
  useInstanceSettings().stripePublishableKey ||
  import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY ||
  undefined;

const completeInstanceSetup = () =>
  api
    .post<
      undefined,
      { result: InstanceSettings }
    >("v1/admin/setup/complete", undefined)
    .then((r) => r.result);

export function useCompleteInstanceSetupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeInstanceSetup,
    onSuccess(settings) {
      queryClient.setQueryData(queryInstanceSettings().queryKey, settings);
      return queryClient.invalidateQueries({
        queryKey: querySetupStatus().queryKey,
      });
    },
  });
}

export const loadInstanceSettings = async (
  queryClient: QueryClient
): Promise<InstanceSettings> => {
  try {
    return await queryClient.ensureQueryData(queryInstanceSettings());
  } catch (e) {
    console.error("Could not load the instance settings, using defaults", e);
    queryClient.setQueryData(
      queryInstanceSettings().queryKey,
      DEFAULT_INSTANCE_SETTINGS
    );
    return DEFAULT_INSTANCE_SETTINGS;
  }
};
