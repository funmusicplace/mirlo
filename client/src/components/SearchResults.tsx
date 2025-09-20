import { useId } from "react";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { css } from "@emotion/css";
import { useTranslation, Trans } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  queryArtists,
  queryLabels,
  queryTrackGroups,
  TrackGroupQueryOptions,
} from "queries";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";
import { ButtonLink } from "./common/Button";
import { FaChevronRight } from "react-icons/fa";
import React from "react";
import ArtistSquare from "./Artist/ArtistSquare";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import { queryTracks } from "queries/tracks";
import CollectionPurchaseSquare from "./Profile/Collection/CollectionPurchaseSquare";

const pageSize = 40;

const SearchResults: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const location = useLocation();
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize: limit });
  const tag = params.get("tag");
  const search = params.get("search");
  const [license, setLicense] = React.useState<
    TrackGroupQueryOptions["license"] | ""
  >((params.get("license") as TrackGroupQueryOptions["license"]) ?? "");

  const { data: newReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      tag: tag || undefined,
      title: search ?? undefined,
      license: license || undefined,
    })
  );

  const { data: tags } = useQuery(
    queryTags({
      orderBy: "count",
      tag: search ?? undefined,
      take: 20,
    })
  );

  const { data: artists } = useQuery(
    queryArtists({
      name: search ?? undefined,
      take: 20,
    })
  );

  const { data: labels } = useQuery(
    queryLabels({
      name: search ?? undefined,
      take: 20,
    })
  );

  const { data: tracks } = useQuery(
    queryTracks({
      title: search ?? undefined,
      take: 20,
    })
  );

  const id = useId();
  const headingId = `${id}-recent-releases`;

  return (
    <div
      className={css`
        padding: 2rem 0;
        background-color: var(--mi-white);

        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      {!tag && (
        <SectionHeader
          className={css`
            position: sticky;
            background-color: var(--mi-white);
          `}
        >
          <WidthContainer variant="big">
            <h2 className="h5 section-header__heading">
              {t("tagSearchResults", { search })}
            </h2>
            <div
              className={css`
                margin: 0 0.5rem;
              `}
            >
              <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
            </div>
            <div
              className={css`
                display: flex;
                justify-content: flex-end;
              `}
            >
              <ButtonLink
                to="/tags"
                className={css`
                  margin-top: 0.25rem;
                `}
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("browseTags")}
              </ButtonLink>
            </div>
          </WidthContainer>
        </SectionHeader>
      )}

      {!!artists?.results.length && (
        <>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h1 className="h5 section-header__heading" id={headingId}>
                {search ? t("artistsForSearch", { search }) : t("artists")}
              </h1>
            </WidthContainer>
          </SectionHeader>

          <WidthContainer variant="big" justify="center">
            <div
              className={css`
                display: flex;
                width: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                padding: var(--mi-side-paddings-xsmall);
              `}
            >
              <TrackgroupGrid gridNumber="4">
                {artists?.results?.map((artist) => (
                  <ArtistSquare key={artist.id} artist={artist} />
                ))}
              </TrackgroupGrid>
            </div>
          </WidthContainer>
        </>
      )}
      {!!newReleases?.results.length && (
        <>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h1 className="h5 section-header__heading" id={headingId}>
                {search
                  ? t("releasesForSearch", { search })
                  : t("recentReleases")}
              </h1>
            </WidthContainer>
          </SectionHeader>
          <WidthContainer variant="big" justify="center">
            <div
              className={css`
                display: flex;
                width: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                padding: var(--mi-side-paddings-xsmall);
              `}
            >
              <TrackgroupGrid
                gridNumber="4"
                as="ul"
                aria-labelledby={headingId}
                role="list"
              >
                {newReleases?.results?.map((trackGroup) => (
                  <ArtistTrackGroup
                    key={trackGroup.id}
                    trackGroup={trackGroup}
                    as="li"
                    showArtist
                  />
                ))}
              </TrackgroupGrid>
            </div>
          </WidthContainer>
        </>
      )}

      {!!tracks?.results.length && (
        <>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h1 className="h5 section-header__heading" id={headingId}>
                {search
                  ? t("releasesForSearch", { search })
                  : t("recentReleases")}
              </h1>
            </WidthContainer>
          </SectionHeader>
          <WidthContainer variant="big" justify="center">
            <div
              className={css`
                display: flex;
                width: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                padding: var(--mi-side-paddings-xsmall);
              `}
            >
              <TrackgroupGrid
                gridNumber="4"
                as="ul"
                aria-labelledby={headingId}
                role="list"
              >
                {tracks?.results?.map((track) => (
                  <CollectionPurchaseSquare
                    trackGroup={track.trackGroup}
                    key={track.id}
                    track={track}
                  />
                ))}
              </TrackgroupGrid>
            </div>
          </WidthContainer>
        </>
      )}

      {!!labels?.results.length && (
        <>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h1 className="h5 section-header__heading" id={headingId}>
                {search ? t("labelsForSearch", { search }) : t("labels")}
              </h1>
            </WidthContainer>
          </SectionHeader>

          <WidthContainer variant="big" justify="center">
            <div
              className={css`
                display: flex;
                width: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                padding: var(--mi-side-paddings-xsmall);
              `}
            >
              <TrackgroupGrid gridNumber="4">
                {labels?.results?.map((label) => (
                  <ArtistSquare key={label.id} artist={label} />
                ))}
              </TrackgroupGrid>
            </div>
          </WidthContainer>
        </>
      )}
    </div>
  );
};

export default SearchResults;
