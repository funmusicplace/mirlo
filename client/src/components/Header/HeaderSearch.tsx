import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";
import { debounce } from "lodash";

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });

  const getOptions = React.useCallback(
    debounce(async (searchString: string) => {
      const artists = await api.getMany<Artist>(`artists`, {
        name: searchString,
      });
      const trackGroups = await api.getMany<TrackGroup>(`trackGroups`, {
        title: searchString,
      });
      const tracks = await api.getMany<Track>(`tracks`, {
        title: searchString,
      });
      return [
        ...artists.results.map((r) => ({
          artistId: r.urlSlug ?? r.id,
          id: r.id,
          name: r.name,
          isArtist: true,
        })),
        ...trackGroups.results.map((t) => ({
          id: t.urlSlug ?? t.id,
          artistId: t.artist?.urlSlug ?? t.artistId,
          trackGroupId: t.urlSlug ?? t.id,
          name: t.title,
          isTrackGroup: true,
        })),
        ...tracks.results.map((t) => ({
          id: t.id,
          trackGroupId: t.trackGroup.urlSlug ?? t.trackGroupId,
          artistId: t.trackGroup.artist.urlSlug ?? t.trackGroup.artistId,
          name: t.title,
          isTrack: true,
        })),
      ];
    }, 500),
    []
  );

  return (
    <AutoComplete
      getOptions={getOptions}
      showBackground
      placeholder={t("searchArtists") ?? ""}
      usesNavigation
      resultsPrefix={t("searchSuggestions") ?? undefined}
      optionDisplay={(r: {
        id: number | string;
        name: string;
        artistId?: number | string;
        trackGroupId?: number | string;
      }) => {
        let url = "";

        if (r.artistId) {
          url += r.artistId;

          if (r.trackGroupId) {
            url += `/release/${r.trackGroupId}`;

            if (r.id !== r.trackGroupId) {
              url += `/tracks/${r.id}`;
            }
          }
        }

        return <Link to={url}>{r.name}</Link>;
      }}
    />
  );
};

export default HeaderSearch;
