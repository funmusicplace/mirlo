import { QueryFunction, queryOptions } from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_MERCH } from "./queryKeys";

const fetchMerchItemTypes: QueryFunction<
  { results: MerchItemType[] },
  ["fetchMerchItemTypes", ...any]
> = ({ signal }) => {
  return api.get(`v1/merchItemTypes`, { signal });
};

export function queryMerchItemTypes() {
  return queryOptions({
    queryKey: ["fetchMerchItemTypes", {}, QUERY_KEY_MERCH],
    queryFn: fetchMerchItemTypes,
    staleTime: Infinity,
  });
}
