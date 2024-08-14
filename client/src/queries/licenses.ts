import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_TAGS } from "./queryKeys";

const fetchLicenses: QueryFunction<
  { results: License[]; total?: number },
  ["fetchLicenses", ...any]
> = ({ queryKey: [_, {}], signal }) => {
  const params = new URLSearchParams();

  return api.get(`v1/licenses?${params}`, { signal });
};

export function queryLicenses() {
  return queryOptions({
    queryKey: ["fetchLicenses", {}, QUERY_KEY_TAGS],
    queryFn: fetchLicenses,
  });
}
