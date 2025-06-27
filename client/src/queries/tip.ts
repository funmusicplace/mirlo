import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchTip: QueryFunction<
  UserArtistTip,
  ["fetchTip", { tipId: string }]
> = ({ queryKey: [_, { tipId }], signal }) => {
  return api
    .get<{
      result: UserArtistTip;
    }>(`v1/manage/tips/${tipId}`, {
      signal,
    })
    .then((r) => r.result);
};

export function queryTip(opts: { tipId: string }) {
  return queryOptions({
    queryKey: [
      "fetchTip",
      {
        tipId: opts.tipId,
      },
    ],
    queryFn: fetchTip,
  });
}
