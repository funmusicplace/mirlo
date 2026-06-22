import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import {
  queryArtists,
  queryTrackGroups,
  TrackGroupQueryOptions,
} from "queries";
import { queryTags } from "queries/tags";
import { queryTracks } from "queries/tracks";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import usePagination from "utils/usePagination";

import { bp } from "../../constants";

import ArtistSquare from "components/Artist/ArtistSquare";
import ReleaseCard from "components/common/ReleaseCard";
import TrackCard from "components/common/TrackCard";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { ButtonLink } from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import WidthContainer from "components/common/WidthContainer";
import { SectionHeader } from "components/common/SectionHeader";
import TrackGroupPills from "components/TrackGroup/TrackGroupPills";

const pageSize = 40;

const Index: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page } = usePagination({ pageSize: limit });
  const tag = params.get("tag");
  const search = params.get("search");
  const [license] = React.useState<TrackGroupQueryOptions["license"] | "">(
    (params.get("license") as TrackGroupQueryOptions["license"]) ?? ""
  );

  const { data: newReleases, isPending: isLoadingReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      tag: tag || undefined,
      title: search ?? undefined,
      license: license || undefined,
    })
  );

  const { data: tags, isPending: isLoadingTags } = useQuery(
    queryTags({
      orderBy: "count",
      tag: search ?? undefined,
      take: 20,
    })
  );

  const { data: artists, isPending: isLoadingArtists } = useQuery(
    queryArtists({
      name: search ?? undefined,
      isLabel: false,
      take: 20,
    })
  );

  const { data: labels, isPending: isLoadingLabels } = useQuery(
    queryArtists({
      name: search ?? undefined,
      isLabel: true,
      take: 20,
    })
  );

  const { data: tracks, isPending: isLoadingTracks } = useQuery(
    queryTracks({
      title: search ?? undefined,
      take: 20,
    })
  );

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
      <h1>{t("searchResults", { search })}</h1>
      <SectionHeader>
        <WidthContainer
          variant="big"
          justify="space-between"
          className={css`
            flex-direction: row;
            display: flex;
          `}
        >
          <h2 className="h5 section-header__heading">
            {search ? t("tagSearchResults", { search }) : t("tags")}
          </h2>
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
            <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
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
          <h2 className="h5 section-header__heading">
            {search ? t("artistsForSearch", { search }) : t("artists")}
          </h2>
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
          <h2 className="h5 section-header__heading">
            {search ? t("releasesForSearch", { search }) : t("recentReleases")}
          </h2>
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
          <TrackgroupGrid gridNumber="4" as="ul">
            {newReleases?.results?.map((trackGroup) => (
              <ReleaseCard
                key={trackGroup.id}
                trackGroup={trackGroup}
                as="li"
                showArtist
                headingLevel="h3"
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
          <h2 className="h5 section-header__heading">
            {search ? t("tracksForSearch", { search }) : t("recentTracks")}
          </h2>
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
          <TrackgroupGrid gridNumber="4" as="ul">
            {tracks?.results?.map((track) => (
              <TrackCard
                track={track}
                key={track.id}
                as="li"
                showArtist
                headingLevel="h3"
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
          <h2 className="h5 section-header__heading">
            {search ? t("labelsForSearch", { search }) : t("labels")}
          </h2>
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
                to="/artists?isLabel=true"
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("viewAllLabels")}
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

export default Index;
