import {
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
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

export type InstanceSetupAnswers = {
  name: string;
  supportEmail?: string;
  colors: { button: string; buttonText: string };
};

const saveInstanceSetup = (answers: InstanceSetupAnswers) =>
  api
    .post<
      InstanceSetupAnswers,
      { result: InstanceSettings }
    >("v1/admin/setup", answers)
    .then((r) => r.result);

export function useInstanceSetupMutation() {
  return useMutation({ mutationFn: saveInstanceSetup });
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
