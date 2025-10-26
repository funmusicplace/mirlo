import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";
import { css } from "@emotion/css";

const constructUrl = (r: any) => {
  let url = "";

  if (r.id === "more") {
    url = `/releases?search=${r.query}`;
    return url;
  }

  if (r.isTag) {
    return `releases?tag=${encodeURIComponent(r.id)}`;
  }

  if (r.isLabel) {
    url = `${r.labelId}`;
    return url;
  }

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
      take: "3",
    });
    const trackGroups = await api.getMany<TrackGroup>(`trackGroups`, {
      title: searchString.trim(),
      take: "3",
    });
    const tracks = await api.getMany<Track>(`tracks`, {
      title: searchString.trim(),
      take: "3",
    });

    const labels = await api.getMany<Label>(`artists`, {
      name: searchString.trim(),
      isLabel: "true",
      take: "3",
    });

    const tags = await api.getMany<Tag>(`tags`, {
      tag: searchString.trim(),
      orderBy: "count",
      take: "3",
    });

    const manyMoreArtists = (artists.total ?? 0) > artists.results.length;

    const results = [
      ...tags.results.map((r, rid) => ({
        firstInCategory: rid === 0,
        category: t("tags"),
        id: r.tag,
        name: r.tag,
        isTag: true,
      })),
      ...(manyMoreArtists
        ? [
            {
              id: "more",
              firstInCategory: true,
              category: t("artists"),
              name: t("moreArtist"),
              query: searchString,
              isArtist: true,
            },
          ]
        : []),
      ...artists.results.map((r, rid) => ({
        category: t("artists"),
        firstInCategory: manyMoreArtists ? false : rid === 0,
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
        name: tr.title ?? t("untitled") ?? "",
        isTrackGroup: true,
      })),
      ...tracks.results.map((tr, tid) => ({
        firstInCategory: tid === 0,
        id: tr.id,
        category: t("tracks"),
        trackGroupId: tr.trackGroup.urlSlug ?? tr.trackGroupId,
        artistId: tr.trackGroup.artist.urlSlug ?? tr.trackGroup.artistId,
        name: tr.title ?? t("untitled") ?? "",
        isTrack: true,
      })),
      ...labels.results.map((label, tid) => ({
        firstInCategory: tid === 0,
        id: label.id,
        category: t("labels"),
        labelId: label.urlSlug ?? label.id,
        name: label.name,
        isLabel: true,
      })),
    ];
    return results;
  }, []);

  const onEnter = React.useCallback((value: string) => {
    navigate(`/search?search=${value}`);
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
        optionDisplay={(r: {
          id: number | string;
          name: string;
          artistId?: number | string;
          trackGroupId?: number | string;
        }) => {
          return (
            <Link
              to={constructUrl(r)}
              className={
                r.id === "more"
                  ? css`
                      font-style: italic;
                      text-decoration: none;
                      text-align: right;
                      font-size: 0.9rem;
                      &:before {
                        content: "→";
                        margin-right: 0.5rem;
                      }
                    `
                  : ""
              }
            >
              {r.id !== "more" && r.name.length > 17
                ? r.name.substring(0, 17) + "..."
                : r.name}
            </Link>
          );
        }}
      />
    </div>
  );
};

export default HeaderSearch;
