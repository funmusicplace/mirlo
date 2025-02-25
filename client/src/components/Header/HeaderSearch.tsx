import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });

  const getOptions = React.useCallback(async (searchString: string) => {
    const artists = await api.getMany<Artist>(`artists`, {
      name: searchString,
    });
    const trackGroups = await api.getMany<TrackGroup>(`trackGroups`, {
      title: searchString,
    });
    const tracks = await api.getMany<Track>(`tracks`, {
      title: searchString,
    });
    const results = [
      ...artists.results.map((r, rid) => ({
        firstInCategory: rid === 0,
        category: t("artists"),
        artistId: r.urlSlug ?? r.id,
        id: r.id,
        name: r.name,
        isArtist: true,
      })),
      ...trackGroups.results.map((tr, tid) => ({
        firstInCategory: tid === 0,
        category: t("albums"),
        id: tr.urlSlug ?? tr.id,
        artistId: tr.artist?.urlSlug ?? tr.artistId,
        trackGroupId: tr.urlSlug ?? tr.id,
        name: tr.title,
        isTrackGroup: true,
      })),
      ...tracks.results.map((tr, tid) => ({
        firstInCategory: tid === 0,
        id: tr.id,
        category: t("tracks"),
        trackGroupId: tr.trackGroup.urlSlug ?? tr.trackGroupId,
        artistId: tr.trackGroup.artist.urlSlug ?? tr.trackGroup.artistId,
        name: tr.title,
        isTrack: true,
      })),
    ];
    return results;
  }, []);

  return (
    <AutoComplete
      getOptions={getOptions}
      showBackground
      placeholder={t("search") ?? ""}
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
