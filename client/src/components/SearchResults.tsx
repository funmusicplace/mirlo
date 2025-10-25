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
import Button, { ButtonLink } from "./common/Button";
import { FaChevronRight } from "react-icons/fa";
import React from "react";
import ArtistSquare from "./Artist/ArtistSquare";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import { queryTracks } from "queries/tracks";
import CollectionPurchaseSquare from "./Profile/Collection/CollectionPurchaseSquare";
import LoadingBlocks from "./Artist/LoadingBlocks";
import SpaceBetweenDiv from "./common/SpaceBetweenDiv";

const pageSize = 40;

const SearchResults: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page } = usePagination({ pageSize: limit });
  const tag = params.get("tag");
  const search = params.get("search");
  const [license] = React.useState<TrackGroupQueryOptions["license"] | "">(
    (params.get("license") as TrackGroupQueryOptions["license"]) ?? ""
  );

  const { data: newReleases, isFetching: isLoadingReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      tag: tag || undefined,
      title: search ?? undefined,
      license: license || undefined,
    })
  );

  const { data: tags, isFetching: isLoadingTags } = useQuery(
    queryTags({
      orderBy: "count",
      tag: search ?? undefined,
      take: 20,
    })
  );

  const { data: artists, isFetching: isLoadingArtists } = useQuery(
    queryArtists({
      name: search ?? undefined,
      take: 20,
    })
  );

  const { data: labels, isFetching: isLoadingLabels } = useQuery(
    queryArtists({
      name: search ?? undefined,
      isLabel: true,
      take: 20,
    })
  );

  const { data: tracks, isFetching: isLoadingTracks } = useQuery(
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
      {/* Tags Section */}
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
            {search ? t("tagSearchResults", { search }) : t("tags")}
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
          {!!tags?.results.length && (
            <TrackgroupGrid gridNumber="4">
              <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
            </TrackgroupGrid>
          )}
          {isLoadingTags && <LoadingBlocks squares />}
          {!isLoadingTags && !tags?.results.length && (
            <SpaceBetweenDiv>
              <p>{t("noTagsFound")}</p>
              <ButtonLink
                to="/tags"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("browseTags")}
              </ButtonLink>
            </SpaceBetweenDiv>
          )}
        </div>
      </WidthContainer>
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
          {!!artists?.results.length && (
            <TrackgroupGrid gridNumber="4">
              {artists?.results?.map((artist) => (
                <ArtistSquare key={artist.id} artist={artist} />
              ))}
            </TrackgroupGrid>
          )}
          {isLoadingArtists && <LoadingBlocks squares />}
          {!isLoadingArtists && !artists?.results.length && (
            <SpaceBetweenDiv>
              <p>{t("noArtistsFound")}</p>
              <ButtonLink
                to="/artists"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("viewAllArtists")}
              </ButtonLink>
            </SpaceBetweenDiv>
          )}
        </div>
      </WidthContainer>
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
            {search ? t("releasesForSearch", { search }) : t("recentReleases")}
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
          {isLoadingReleases && <LoadingBlocks squares />}
          {!isLoadingReleases && !newReleases?.results.length && (
            <SpaceBetweenDiv>
              <p>{t("noReleasesFound")}</p>
              <ButtonLink
                to="/releases"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("viewAllReleases")}
              </ButtonLink>
            </SpaceBetweenDiv>
          )}
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
            {search ? t("tracksForSearch", { search }) : t("recentTracks")}
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
          {isLoadingTracks && <LoadingBlocks squares />}
          {!isLoadingTracks && !tracks?.results.length && (
            <SpaceBetweenDiv>
              <p>{t("noTracksFound")}</p>
              <ButtonLink
                to="/releases"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("viewAllReleases")}
              </ButtonLink>
            </SpaceBetweenDiv>
          )}
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
          {isLoadingLabels && <LoadingBlocks squares />}
          {!isLoadingLabels && !labels?.results.length && (
            <SpaceBetweenDiv>
              <p>{t("noLabelsFound")}</p>
              <ButtonLink
                to="/releases"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("viewAllReleases")}
              </ButtonLink>
            </SpaceBetweenDiv>
          )}
          <TrackgroupGrid gridNumber="4">
            {labels?.results?.map((label) => (
              <ArtistSquare key={label.id} artist={label} />
            ))}
          </TrackgroupGrid>
        </div>
      </WidthContainer>
    </div>
  );
};

export default SearchResults;
