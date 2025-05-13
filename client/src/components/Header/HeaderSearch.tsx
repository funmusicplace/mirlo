import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";

const constructUrl = (r: any) => {
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
  return url;
};

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });
  const navigate = useNavigate();

  const getOptions = React.useCallback(async (searchString: string) => {
    const artists = await api.getMany<Artist>(`artists`, {
      name: searchString.trim(),
    });
    const trackGroups = await api.getMany<TrackGroup>(`trackGroups`, {
      title: searchString.trim(),
    });
    const tracks = await api.getMany<Track>(`tracks`, {
      title: searchString.trim(),
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

  const onEnter = React.useCallback((value: string) => {
    navigate(`/releases?search=${value}`);
  }, []);

  return (
    <div role="search">
      <AutoComplete
        getOptions={getOptions}
        showBackground
        placeholder={t("search") ?? ""}
        usesNavigation
        onSelect={(value) => {
          navigate(constructUrl(value));
        }}
        onEnter={onEnter}
        resultsPrefix={t("searchSuggestions") ?? undefined}
        optionDisplay={(r: {
          id: number | string;
          name: string;
          artistId?: number | string;
          trackGroupId?: number | string;
        }) => {
          return <Link to={constructUrl(r)}>{r.name}</Link>;
        }}
      />
    </div>
  );
};

export default HeaderSearch;
