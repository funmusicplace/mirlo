import { QueryFunction, queryOptions } from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";

const fetchSetting: QueryFunction<
  string,
  ["fetchSetting", { setting: string }]
> = ({ queryKey: [_, { setting }], signal }) => {
  return api
    .get<{
      result: string;
    }>(`v1/settings/${setting}`, { signal })
    .then((r) => r.result);
};

export function querySetting(setting: string) {
  return queryOptions({
    queryKey: ["fetchSetting", { setting }],
    queryFn: fetchSetting,
  });
}

const fetchFeaturedArtists: QueryFunction<
  Artist[],
  ["fetchFeaturedArtists"]
> = ({ signal }) => {
  return api
    .get<{ result: Artist[] }>(`v1/settings/featuredArtists`, { signal })
    .then((r) => r.result);
};

export function queryFeaturedArtists() {
  return queryOptions({
    queryKey: ["fetchFeaturedArtists"],
    queryFn: fetchFeaturedArtists,
  });
}

const fetchInstanceArtist: QueryFunction<Artist, ["fetchInstanceArtist"]> = ({
  queryKey: [_],
  signal,
}) => {
  return api
    .get<{
      result: Artist;
    }>(`v1/settings/instanceArtist`, { signal })
    .then((r) => r.result);
};

export function queryInstanceArtist() {
  return queryOptions({
    queryKey: ["fetchInstanceArtist"],
    queryFn: fetchInstanceArtist,
  });
}
