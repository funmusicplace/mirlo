import { useId } from "react";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useParams } from "react-router-dom";
import { queryArtists, queryTrackGroups } from "queries";
import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "./common/Button";
import { FaChevronRight } from "react-icons/fa";
import React from "react";
import ArtistSquare from "./Artist/ArtistSquare";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import LoadingBlocks from "./Artist/LoadingBlocks";
import SpaceBetweenDiv from "./common/SpaceBetweenDiv";
import { getLocationTagBySlug } from "queries/locationTags";
import NotFoundPage from "./404";

const pageSize = 40;

const SearchResults: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const { locationSlug } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page } = usePagination({ pageSize: limit });

  const { data: thisLocation, isPending } = useQuery(
    getLocationTagBySlug(locationSlug)
  );

  const { data: newReleases, isPending: isLoadingReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      locationSlug: locationSlug || undefined,
    })
  );

  const { data: artists, isPending: isLoadingArtists } = useQuery(
    queryArtists({
      take: 20,
      locationSlug: locationSlug || undefined,
    })
  );

  const { data: labels, isPending: isLoadingLabels } = useQuery(
    queryArtists({
      isLabel: true,
      locationSlug: locationSlug || undefined,
      take: 20,
    })
  );

  const id = useId();
  const headingId = `${id}-recent-releases`;

  if (!thisLocation && !isPending) {
    return <NotFoundPage />;
  }

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
      {!thisLocation && <LoadingBlocks squares />}
      {thisLocation && (
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
              <h2 className="h5 section-header__heading" id={headingId}>
                <Trans
                  i18nKey="resultsForLocation"
                  t={t}
                  components={{ strong: <strong /> }}
                  values={{
                    location: [
                      thisLocation.city,
                      thisLocation.region,
                      thisLocation.country,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  }}
                />
              </h2>
            </WidthContainer>
          </SectionHeader>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h2 className="h5 section-header__heading" id={headingId}>
                {t("artists")}
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
              <h2 className="h5 section-header__heading" id={headingId}>
                {t("releases")}
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
              <h2 className="h5 section-header__heading" id={headingId}>
                {t("labels")}
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
        </>
      )}
    </div>
  );
};

export default SearchResults;
