import { SplashTitle } from "components/Home/Splash";
import { css } from "@emotion/css";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryTrackGroups } from "queries";
import { queryTags } from "queries/tags";
import { useTranslation } from "react-i18next";
import { FaRedoAlt, FaChevronRight, FaRss } from "react-icons/fa";
import { bp } from "../../constants";
import { Button, ButtonAnchor, ButtonLink } from "components/common/Button";
import WidthContainer from "components/common/WidthContainer";
import { SectionHeader } from "components/common/SectionHeader";
import TrackGroupPills from "components/TrackGroup/TrackGroupPills";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import ReleaseCard from "components/common/ReleaseCard";
import { queryTopSoldTrackGroups } from "queries";
import HomeFeaturedArtists from "components/Home/HomeFeaturedArtists";

const futureReleasesPageSize = 6;

const PopularReleasesSection = styled.div`
  padding: 4rem 0;

  & > :first-child {
    margin-top: 0;
  }
`;

const HomeReleases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });

  const { data: tags } = useQuery(
    queryTags({
      orderBy: "count",
      take: 24,
    })
  );

  const { data: newReleases, refetch } = useQuery({
    ...queryTrackGroups({
      skip: 0,
      take: 8,
      orderBy: "random",
      tag: undefined,
      title: undefined,
      isReleased: "released",
      license: undefined,
    }),
    refetchOnWindowFocus: false,
  });

  const { data: popularReleases } = useQuery(
    queryTopSoldTrackGroups({
      skip: 0,
      take: futureReleasesPageSize,
      datePurchased: "pastMonth",
    })
  );

  return (
    <div className="w-full">
      <div
        className={css`
          padding: 2rem 0;

          @media screen and (max-width: ${bp.medium}px) {
            margin-bottom: 0rem;
          }
        `}
      >
        <SectionHeader
          className={css`
            background-color: var(--mi-white);
          `}
        >
          <WidthContainer variant="big">
            <SplashTitle as="h2" className="mbe-8! mx-2">
              {t("exploreMusic", { keyPrefix: "home" })}
            </SplashTitle>
            <h3 className="h5 section-header__heading">{t("popularTags")}</h3>
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

                @media screen and (max-width: ${bp.medium}px) {
                  padding: var(--mi-side-paddings-xsmall);
                }
              `}
            >
              <ButtonLink
                to="/tags"
                wrap
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

        <SectionHeader>
          <WidthContainer
            variant="big"
            justify="space-between"
            className="flex items-center"
          >
            <h3 className="h5 section-header__heading">
              {t("recentReleases")}
            </h3>
            <div
              className={css`
                display: flex;
                gap: 0.75rem;
                @media screen and (max-width: ${bp.medium}px) {
                  padding: var(--mi-side-paddings-xsmall);
                }
              `}
            >
              <Button
                onClick={() => refetch()}
                startIcon={<FaRedoAlt />}
                variant="transparent"
              >
                {t("refreshReleases", { keyPrefix: "home" })}
              </Button>
              <ButtonAnchor
                aria-label={t("rssFeed")}
                title={t("rssFeed")}
                target="_blank"
                href={`${import.meta.env.VITE_API_DOMAIN}/v1/trackGroups&released=released&format=rss`}
                rel="noreferrer"
                onlyIcon
                smallIcon
                className={css`
                  margin-top: 0.25rem;
                `}
                startIcon={<FaRss />}
              />
            </div>
          </WidthContainer>
        </SectionHeader>

        <div
          className={css`
            padding-top: 0.25rem;
          `}
        >
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
              <TrackgroupGrid gridNumber="4" as="ul">
                {newReleases?.results?.map((trackGroup) => (
                  <ReleaseCard
                    key={trackGroup.id}
                    trackGroup={trackGroup}
                    as="li"
                    showArtist
                    headingLevel="h4"
                  />
                ))}
              </TrackgroupGrid>
            </div>
          </WidthContainer>
        </div>
      </div>

      <WidthContainer
        variant="big"
        className="flex gap-4 !justify-end !mb-16 max-md:p-[var(--mi-side-paddings-xsmall)]"
      >
        <ButtonLink wrap variant="outlined" to="/artists">
          {t("viewAllArtists")}
        </ButtonLink>
        <ButtonLink wrap to="/releases" endIcon={<FaChevronRight />}>
          {t("moreReleases")}
        </ButtonLink>
      </WidthContainer>

      <HomeFeaturedArtists />

      {(popularReleases?.results ?? []).length > 0 && (
        <PopularReleasesSection>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className="flex flex-row"
            >
              <h3 className="h5 section-header__heading">
                {t("popularReleases")}
              </h3>
            </WidthContainer>
          </SectionHeader>
          <div className="pt-1">
            <WidthContainer variant="big" justify="center">
              <div className="flex w-full flex-row flex-wrap p-[var(--mi-side-paddings-xsmall)]">
                <TrackgroupGrid gridNumber="6" as="ul">
                  {popularReleases?.results?.map((trackGroup) => (
                    <ReleaseCard
                      key={trackGroup.id}
                      trackGroup={trackGroup}
                      as="li"
                      showArtist
                      headingLevel="h4"
                    />
                  ))}
                </TrackgroupGrid>
              </div>
            </WidthContainer>
          </div>
        </PopularReleasesSection>
      )}
    </div>
  );
};

export default HomeReleases;
