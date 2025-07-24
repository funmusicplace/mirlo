import { QueryFunction, queryOptions } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";

const fetchArtistLabels: QueryFunction<
  ArtistLabel[],
  ["fetchArtistLabels", { artistId: number }]
> = ({ queryKey: [_, { artistId }], signal }) => {
  return api
    .get<{
      results: ArtistLabel[];
    }>(`v1/manage/artists/${artistId}/labels`, { signal })
    .then((r) => r.results);
};

export function queryArtistLabels(artistId: number) {
  return queryOptions({
    queryKey: ["fetchArtistLabels", { artistId }],
    queryFn: fetchArtistLabels,
    enabled: isFinite(artistId),
  });
}

const fetchLabelArtists: QueryFunction<
  {
    results: ArtistLabel[];
  },
  ["fetchLabelArtists"]
> = ({ queryKey: [_], signal }) => {
  return api.get<{
    results: ArtistLabel[];
  }>(`v1/manage/label/`, { signal });
};

export function queryLabelArtists() {
  return queryOptions({
    queryKey: ["fetchLabelArtists"],
    queryFn: fetchLabelArtists,
  });
}

const fetchPublicLabelTrackGroups: QueryFunction<
  {
    results: TrackGroup[];
  },
  ["fetchLabelTrackGroups", { labelSlug?: string }]
> = ({ queryKey: [_, { labelSlug }], signal }) => {
  return api.get<{
    results: TrackGroup[];
  }>(`v1/labels/${labelSlug}/trackGroups`, { signal });
};

export function queryPublicLabelTrackGroups(labelSlug?: string) {
  return queryOptions({
    queryKey: ["fetchLabelTrackGroups", { labelSlug }],
    queryFn: fetchPublicLabelTrackGroups,
    enabled: !!labelSlug,
  });
}

type Label = {
  id: number;
  name: string;
  urlSlug: string;
  description: string;
  avatar: { sizes: string[]; url: string; updatedAt: string };
  banner?: {
    sizes?: { [key: number]: string; original: string };
    url: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  artistLabels: { artist: Artist }[];
  properties?: {
    tileBackgroundImage?: boolean;
  };
};

const fetchLabel: QueryFunction<
  Label,
  ["fetchLabel", { labelSlug?: string }]
> = ({ queryKey: [_, { labelSlug }], signal }) => {
  return api
    .get<{
      result: Label;
    }>(`v1/labels/${labelSlug}`, { signal })
    .then((r) => r.result);
};

export function queryLabelBySlug(labelSlug?: string) {
  return queryOptions({
    queryKey: ["fetchLabel", { labelSlug }],
    queryFn: fetchLabel,
    enabled: !!labelSlug,
  });
}
